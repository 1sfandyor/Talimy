#!/usr/bin/env python3
"""Talimy Bridge Server

Server-side bridge that waits for laptop triggers, pulls latest code, runs deterministic
checks, optionally runs Codex review, and exposes JSON results over HTTP.
"""

from __future__ import annotations

import json
import hashlib
import os
import queue
import re
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = BASE_DIR / "bridge_config.json"
STATE_DIR = BASE_DIR / ".bridge-state"
RESULTS_DIR = STATE_DIR / "results"
EVENTS_DIR = STATE_DIR / "events"
ENV_TOKEN_RE = re.compile(r"^\$\{([A-Z0-9_]+)\}$")


def resolve_config_path() -> Path:
    raw = os.environ.get("BRIDGE_CONFIG_PATH", "").strip()
    if not raw:
        return DEFAULT_CONFIG_PATH
    return Path(raw)


def expand_env_placeholders(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: expand_env_placeholders(v) for k, v in value.items()}
    if isinstance(value, list):
        return [expand_env_placeholders(v) for v in value]
    if isinstance(value, str):
        m = ENV_TOKEN_RE.match(value.strip())
        if m:
            value = os.environ.get(m.group(1), "")
        lowered = value.strip().lower()
        if lowered == "true":
            return True
        if lowered == "false":
            return False
    return value


@dataclass
class BridgeConfig:
    raw: dict[str, Any]

    @property
    def bridge_port(self) -> int:
        return int(self.raw.get("bridge_port", 8765))

    @property
    def branch(self) -> str:
        return str(self.raw.get("branch", "main"))

    @property
    def shared_secret(self) -> str:
        return str(self.raw.get("shared_secret", ""))

    @property
    def server_mode(self) -> str:
        return "runtime_inspector"

    @property
    def server_workdir(self) -> Path:
        raw = str(self.raw.get("server_workdir", "")).strip()
        if raw:
            return Path(raw)
        return BASE_DIR

    @property
    def server_codex(self) -> dict[str, Any]:
        return dict(self.raw.get("server_codex", {}))

    @property
    def server_checks(self) -> dict[str, list[str]]:
        return {k: list(v) for k, v in dict(self.raw.get("server_checks", {})).items()}

    @property
    def task_check_mapping(self) -> dict[str, str]:
        return {
            str(k): str(v)
            for k, v in dict(self.raw.get("task_check_mapping", {})).items()
        }

    @property
    def service_name_patterns(self) -> dict[str, list[str]]:
        raw = dict(self.raw.get("service_name_patterns", {}))
        parsed: dict[str, list[str]] = {}
        for alias, patterns in raw.items():
            if isinstance(patterns, list):
                parsed[str(alias)] = [str(x) for x in patterns]
            elif isinstance(patterns, str):
                parsed[str(alias)] = [patterns]
        return parsed


class JsonStore:
    def __init__(self, results_dir: Path) -> None:
        self.results_dir = results_dir
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def write(self, job_id: str, payload: dict[str, Any]) -> None:
        with self._lock:
            (self.results_dir / f"{job_id}.json").write_text(
                json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8"
            )

    def read(self, job_id: str) -> dict[str, Any] | None:
        path = self.results_dir / f"{job_id}.json"
        if not path.exists():
            return None
        with self._lock:
            return json.loads(path.read_text(encoding="utf-8"))


class EventStore:
    def __init__(self, events_dir: Path) -> None:
        self.events_dir = events_dir
        self.events_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def append(self, job_id: str, payload: dict[str, Any]) -> None:
        path = self.events_dir / f"{job_id}.jsonl"
        line = json.dumps(payload, ensure_ascii=True)
        with self._lock:
            with path.open("a", encoding="utf-8") as fh:
                fh.write(line + "\n")

    def read(self, job_id: str) -> list[dict[str, Any]]:
        path = self.events_dir / f"{job_id}.jsonl"
        if not path.exists():
            return []
        items: list[dict[str, Any]] = []
        with self._lock:
            for raw in path.read_text(encoding="utf-8").splitlines():
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    items.append(json.loads(raw))
                except json.JSONDecodeError:
                    items.append({"event_type": "parse_error", "raw": raw})
        return items


class BridgeServerState:
    def __init__(self, config: BridgeConfig) -> None:
        self.config = config
        self.jobs = JsonStore(RESULTS_DIR)
        self.events = EventStore(EVENTS_DIR)
        self.q: queue.Queue[dict[str, Any]] = queue.Queue()

    def enqueue(self, payload: dict[str, Any]) -> None:
        self.q.put(payload)


def load_config() -> BridgeConfig:
    config_path = resolve_config_path()
    raw = json.loads(config_path.read_text(encoding="utf-8"))
    raw = expand_env_placeholders(raw)
    return BridgeConfig(raw=raw)


def secret_fingerprint(secret: str) -> str:
    if not secret:
        return "none"
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()[:12]


def run_command(command: str, cwd: Path, timeout: int = 300) -> dict[str, Any]:
    started_at = time.time()
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return {
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "duration_seconds": round(time.time() - started_at, 2),
    }


TASK_NUMBER_RE = re.compile(r"\b(?P<phase>\d+)\.(?P<task>\d+)\b")
SERVICE_TOKEN_RE = re.compile(r"\{\{service:(?P<alias>[a-zA-Z0-9_-]+)\}\}")


def detect_check_set(
    task: str,
    checks: dict[str, list[str]],
    task_mapping: dict[str, str],
) -> tuple[str, list[str]]:
    task_l = task.lower()

    match = TASK_NUMBER_RE.search(task)
    if match:
        task_no = f"{match.group('phase')}.{match.group('task')}"
        phase_no = match.group("phase")
        for key in (task_no, f"{phase_no}.x", phase_no):
            mapped_check_key = task_mapping.get(key)
            if mapped_check_key:
                return mapped_check_key, checks.get(mapped_check_key, checks.get("default", []))

    if any(token in task_l for token in ["api", "backend", "nest"]):
        return "api", checks.get("api", checks.get("default", []))
    if any(token in task_l for token in ["web", "frontend", "next", "platform"]):
        return "web", checks.get("web", checks.get("default", []))
    return "default", checks.get("default", [])


def list_docker_services(cwd: Path) -> list[str]:
    res = run_command('docker service ls --format "{{.Name}}"', cwd, timeout=60)
    if res["returncode"] != 0:
        return []
    return [line.strip() for line in str(res["stdout"]).splitlines() if line.strip()]


def resolve_service_alias(alias: str, config: BridgeConfig, cwd: Path) -> str:
    patterns = config.service_name_patterns.get(alias, [])
    services = list_docker_services(cwd)
    if not services:
        return alias

    for pattern in patterns:
        for name in services:
            if name == pattern:
                return name
        for name in services:
            if name.startswith(pattern):
                return name
        for name in services:
            if pattern in name:
                return name

    # Reasonable fallback for common aliases if config not filled yet
    fallback_tokens = [f"talimy-{alias}", alias]
    for token in fallback_tokens:
        for name in services:
            if name.startswith(token) or token in name:
                return name
    return alias


def render_check_command(command: str, config: BridgeConfig, cwd: Path) -> str:
    def repl(match: re.Match[str]) -> str:
        alias = match.group("alias")
        return resolve_service_alias(alias, config, cwd)

    if "{{service:" not in command:
        return command
    return SERVICE_TOKEN_RE.sub(repl, command)


def run_codex_prompt(
    codex_bin: str,
    prompt: str,
    *,
    cwd: Path,
    timeout: int,
) -> subprocess.CompletedProcess[str]:
    """Run codex prompt with CLI-compat fallback across versions."""
    variants = [
        [codex_bin, "exec", "--skip-git-repo-check", "--color", "never", prompt],
        [codex_bin, "exec", "--color", "never", prompt],
        [codex_bin, "--no-interactive", "-q", prompt],
        [codex_bin, "-q", prompt],
        [codex_bin, prompt],
    ]
    last_result: subprocess.CompletedProcess[str] | None = None
    for args in variants:
        result = subprocess.run(
            args,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        last_result = result
        stderr_l = (result.stderr or "").lower()
        if result.returncode == 0:
            return result
        if "unexpected argument '--no-interactive'" in stderr_l:
            continue
        if "unknown option '--no-interactive'" in stderr_l:
            continue
        if "unexpected argument '-q'" in stderr_l:
            continue
        if "unknown option '-q'" in stderr_l:
            continue
        if "unrecognized subcommand 'exec'" in stderr_l:
            continue
        # For non-flag errors (real codex/runtime errors), stop and return.
        return result
    assert last_result is not None
    return last_result


def run_server_codex_review(
    trigger: dict[str, Any], config: BridgeConfig, workdir: Path, *, mode: str
) -> dict[str, Any] | None:
    codex_cfg = config.server_codex
    if not codex_cfg.get("enabled", False):
        return None

    codex_bin = str(codex_cfg.get("binary", "codex"))
    timeout = int(codex_cfg.get("timeout_seconds", 300))

    session_ctx = trigger.get("session_context") if isinstance(trigger.get("session_context"), dict) else {}
    session_excerpt = str(session_ctx.get("excerpt") or "").strip()
    session_context_block = ""
    if session_excerpt:
        session_context_block = (
            "\n\nLaptop Codex session context (recent excerpt; use only as context, not source of truth):\n"
            f"{session_excerpt}\n"
        )

    mode_note = (
        "Server roli: runtime inspector (Dokploy/docker service logs va runtime signal tahlili). "
        "Git pull/lint/typecheck qilma."
    )

    prompt = f"""
Taskni tekshir: {trigger.get('task', '')}
Commit: {trigger.get('commit', '')}
{mode_note}
{session_context_block}

Qilish kerak:
1. Mavjud bridge natijalari (checks/logs/events) asosida xulosani tekshir
2. Agar runtime-inspector bo'lsa docker/service log xatolarini tahlil qil
3. Qisqa xulosa ber
4. FAQAT JSON chiqar:
{{
  "status": "success" | "failure",
  "tests_passed": true | false,
  "errors": ["..."],
  "warnings": ["..."],
  "suggestions": ["..."],
  "next_action": "proceed" | "fix_required"
}}
""".strip()

    try:
        result = run_codex_prompt(codex_bin, prompt, cwd=workdir, timeout=timeout)
    except Exception as exc:  # pragma: no cover - runtime safeguard
        return {
            "status": "error",
            "message": f"codex invocation failed: {exc}",
            "next_action": "fix_required",
        }

    stdout = (result.stdout or "").strip()
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start == -1 or end == -1 or end < start:
        return {
            "status": "error",
            "message": "codex JSON parse failed",
            "raw_output": stdout,
            "next_action": "fix_required",
        }

    try:
        parsed = json.loads(stdout[start : end + 1])
    except json.JSONDecodeError as exc:
        return {
            "status": "error",
            "message": f"codex JSON decode error: {exc}",
            "raw_output": stdout,
            "next_action": "fix_required",
        }

    parsed["codex_returncode"] = result.returncode
    return parsed


def run_server_codex_hello(
    config: BridgeConfig, workdir: Path, *, side: str
) -> tuple[str, str, dict[str, Any] | None]:
    codex_cfg = config.server_codex
    if not codex_cfg.get("enabled", False):
        return "", "bridge_server_disabled", {"message": "server_codex.enabled=false"}

    codex_bin = str(codex_cfg.get("binary", "codex"))
    timeout = int(codex_cfg.get("hello_timeout_seconds", 20))
    prompt = (
        "Laptopdagi Codex bridge salomlashuv yubordi. "
        f"Tomon: {side}. "
        "Qisqa 1 jumla javob yozing (o'zbekcha), mazmuni: eshitib turibman va kutaman. "
        "Faqat javob matnini yozing."
    )
    try:
        result = run_codex_prompt(codex_bin, prompt, cwd=workdir, timeout=timeout)
    except Exception as exc:
        return "", "server_codex_error", {"message": f"codex invoke failed: {exc}"}

    reply = (result.stdout or "").strip()
    if result.returncode != 0 or not reply:
        return "", "server_codex_error", {
            "message": "codex hello returned empty/non-zero",
            "returncode": result.returncode,
            "stdout": (result.stdout or "")[:500],
            "stderr": (result.stderr or "")[:500],
        }

    # Keep hello deterministic and one-line even if codex returns multi-line text.
    first_line = next((line.strip() for line in reply.splitlines() if line.strip()), "")
    if not first_line:
        return "", "server_codex_error", {"message": "codex hello output had no non-empty line"}
    return first_line, "server_codex", None


def process_trigger(trigger: dict[str, Any], state: BridgeServerState) -> None:
    config = state.config
    workdir = config.server_workdir
    mode = config.server_mode
    job_id = str(trigger.get("job_id") or "")
    task = str(trigger.get("task") or "code update")

    state.jobs.write(
        job_id,
        {
            "status": "running",
            "tests_passed": False,
            "errors": [],
            "warnings": [],
            "suggestions": [],
            "next_action": "fix_required",
            "task": task,
            "commit": trigger.get("commit"),
            "job_id": job_id,
            "stage": "starting",
            "started_at": int(time.time()),
            "session_context_meta": trigger.get("session_context", {}),
        },
    )
    print(f"[bridge-server] job start job={job_id} task={task}")

    git_steps: list[dict[str, Any]] = []

    check_set_name, checks = detect_check_set(task, config.server_checks, config.task_check_mapping)
    check_results: list[dict[str, Any]] = []
    check_errors: list[str] = []
    for cmd in checks:
        rendered_cmd = render_check_command(cmd, config, workdir)
        res = run_command(rendered_cmd, workdir, timeout=1200)
        if rendered_cmd != cmd:
            res["command_template"] = cmd
        check_results.append(res)
        if res["returncode"] != 0:
            check_errors.append(f"{rendered_cmd} failed")
            if res["stderr"].strip():
                check_errors.append(res["stderr"].strip())
            break

    tests_passed = len(check_errors) == 0

    codex_review = run_server_codex_review(trigger, config, workdir, mode=mode)
    if codex_review:
        review_status = str(codex_review.get("status", "unknown"))
        review_next = str(codex_review.get("next_action", "unknown"))
        review_errors = codex_review.get("errors", [])
        review_error_count = len(review_errors) if isinstance(review_errors, list) else 0
        print(
            f"[bridge-server] codex review job={job_id} status={review_status} "
            f"next_action={review_next} errors={review_error_count}"
        )

    warnings: list[str] = []
    suggestions: list[str] = []
    if codex_review:
        warnings.extend([str(x) for x in codex_review.get("warnings", [])])
        suggestions.extend([str(x) for x in codex_review.get("suggestions", [])])
        if codex_review.get("status") == "failure" and not check_errors:
            check_errors.extend([str(x) for x in codex_review.get("errors", [])])
            tests_passed = False

    result_payload = {
        "status": "success" if tests_passed else "failure",
        "tests_passed": tests_passed,
        "errors": [e for e in check_errors if e],
        "warnings": warnings,
        "suggestions": suggestions,
        "next_action": "proceed" if tests_passed else "fix_required",
        "task": task,
        "commit": trigger.get("commit"),
        "job_id": job_id,
        "stage": "completed",
        "server_mode": mode,
        "git": git_steps,
        "checks": check_results,
        "check_set": check_set_name,
        "codex_review": codex_review,
        "finished_at": int(time.time()),
        "session_context_meta": trigger.get("session_context", {}),
    }
    state.jobs.write(job_id, result_payload)
    print(
        f"[bridge-server] job done job={job_id} status={result_payload['status']} next_action={result_payload['next_action']}"
    )


def worker_loop(state: BridgeServerState) -> None:
    while True:
        trigger = state.q.get()
        try:
            process_trigger(trigger, state)
        except Exception as exc:  # pragma: no cover - runtime safeguard
            job_id = str(trigger.get("job_id") or "unknown")
            print(f"[bridge-server] job exception job={job_id} error={exc}")
            state.jobs.write(
                job_id,
                {
                    "status": "error",
                    "tests_passed": False,
                    "errors": [f"bridge server exception: {exc}"],
                    "warnings": [],
                    "suggestions": ["Server bridge loglarini tekshiring."],
                    "next_action": "fix_required",
                    "task": trigger.get("task"),
                    "commit": trigger.get("commit"),
                    "job_id": job_id,
                },
            )
        finally:
            state.q.task_done()


class Handler(BaseHTTPRequestHandler):
    server_version = "TalimyBridge/1.0"
    state: BridgeServerState

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _console(self, message: str) -> None:
        print(f"[bridge-server] {message}")

    def _json(self, code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        expected = self.state.config.shared_secret
        if not expected:
            return True
        actual = self.headers.get("X-Bridge-Token", "")
        return actual == expected

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._json(200, {"status": "ok"})
            return

        if parsed.path == "/hello":
            params = parse_qs(parsed.query)
            side = (params.get("side") or ["unknown"])[0]
            self._console(f"hello from {side}")
            reply, reply_source, hello_error = run_server_codex_hello(
                self.state.config, self.state.config.server_workdir, side=side
            )
            self._console(f"hello reply source={reply_source} reply={reply or '-'}")
            if hello_error:
                self._console(f"hello codex error={hello_error}")
                self._json(
                    503,
                    {
                        "status": "error",
                        "message": f"bridge-server eshitayapti ({side})",
                        "reply": None,
                        "reply_source": reply_source,
                        "error": hello_error,
                        "server_time": int(time.time()),
                    },
                )
                return
            self._json(
                200,
                {
                    "status": "ok",
                    "message": f"bridge-server eshitayapti ({side})",
                    "reply": reply,
                    "reply_source": reply_source,
                    "server_time": int(time.time()),
                },
            )
            return

        if not self._authorized():
            self._json(401, {"status": "unauthorized"})
            return

        if parsed.path == "/result":
            params = parse_qs(parsed.query)
            job_id = (params.get("job_id") or [""])[0]
            if not job_id:
                self._json(400, {"status": "error", "message": "job_id is required"})
                return
            payload = self.state.jobs.read(job_id)
            if payload is None:
                self._json(404, {"status": "pending", "job_id": job_id})
                return
            self._json(200, payload)
            return

        if parsed.path == "/events":
            params = parse_qs(parsed.query)
            job_id = (params.get("job_id") or [""])[0]
            if not job_id:
                self._json(400, {"status": "error", "message": "job_id is required"})
                return
            self._json(200, {"status": "ok", "job_id": job_id, "events": self.state.events.read(job_id)})
            return

        self._json(404, {"status": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._authorized():
            self._json(401, {"status": "unauthorized"})
            return
        if self.path not in ("/trigger", "/event"):
            self._json(404, {"status": "not_found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception as exc:
            self._json(400, {"status": "error", "message": f"invalid json: {exc}"})
            return

        if self.path == "/event":
            job_id = str(payload.get("job_id") or "no-job").strip()
            event_type = str(payload.get("event_type") or "event").strip()
            event_payload = {
                "job_id": job_id,
                "event_type": event_type,
                "message": str(payload.get("message") or "").strip(),
                "commit": str(payload.get("commit") or "").strip(),
                "task": str(payload.get("task") or "").strip(),
                "workflow": str(payload.get("workflow") or "").strip(),
                "status": str(payload.get("status") or "").strip(),
                "conclusion": str(payload.get("conclusion") or "").strip(),
                "timestamp": int(time.time()),
            }
            self.state.events.append(job_id, event_payload)
            msg = event_payload["message"] or "-"
            wf = event_payload["workflow"] or "-"
            st = event_payload["status"] or "-"
            cc = event_payload["conclusion"] or "-"
            self._console(
                f"event job={job_id} type={event_type} workflow={wf} status={st} conclusion={cc} msg={msg}"
            )

            ack = "Qabul qilindi."
            if event_type == "hello":
                ack = "Yaxshi, eshitib turibman."
            elif event_type == "ci_status":
                conclusion = event_payload["conclusion"].lower()
                status = event_payload["status"].lower()
                if conclusion == "success":
                    ack = f"{event_payload['workflow']} success bo'ldi, kutib turaman."
                elif conclusion and conclusion != "success":
                    ack = f"{event_payload['workflow']} xato bo'ldi, tuzatib qayta yuboring."
                elif status in {"queued", "in_progress", "waiting"}:
                    ack = f"{event_payload['workflow']} kuzatilyapti, kutib turaman."
            elif event_type == "dokploy_status":
                conclusion = event_payload["conclusion"].lower()
                status = event_payload["status"].lower()
                if conclusion == "success":
                    ack = "Dokploy deploy qabul qilindi, runtime natijani kutib turaman."
                elif conclusion and conclusion != "success":
                    ack = "Dokploy deploy xato bo'ldi, tuzatib qayta yuboring."
                elif status in {"queued", "in_progress", "waiting"}:
                    ack = "Dokploy deploy ketayapti, kutib turaman."
            elif event_type == "runtime_status":
                conclusion = event_payload["conclusion"].lower()
                if conclusion == "success":
                    ack = f"{event_payload['workflow']} runtime OK, davom eting."
                elif conclusion == "failure":
                    ack = f"{event_payload['workflow']} runtime xato, tuzatib qayta yuboring."

            self._json(200, {"status": "ok", "ack": ack, "event_type": event_type, "job_id": job_id})
            return

        task = str(payload.get("task") or "").strip()
        commit = str(payload.get("commit") or "").strip()
        job_id = str(payload.get("job_id") or "").strip()
        if not task or not commit or not job_id:
            self._json(400, {"status": "error", "message": "task, commit, job_id are required"})
            return

        state_payload = {
            "status": "queued",
            "tests_passed": False,
            "errors": [],
            "warnings": [],
            "suggestions": [],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "job_id": job_id,
            "stage": "queued",
            "queued_at": int(time.time()),
        }
        self.state.jobs.write(job_id, state_payload)
        self.state.enqueue({"task": task, "commit": commit, "job_id": job_id})
        self._console(f"trigger queued job={job_id} task={task} commit={commit[:8]}")
        self._json(200, {"status": "triggered", "job_id": job_id, "ack": "Trigger olindi, kutib turaman."})


def main() -> int:
    config = load_config()
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    EVENTS_DIR.mkdir(parents=True, exist_ok=True)

    state = BridgeServerState(config)
    worker = threading.Thread(target=worker_loop, args=(state,), daemon=True)
    worker.start()

    class BoundHandler(Handler):
        pass

    BoundHandler.state = state
    server = ThreadingHTTPServer(("0.0.0.0", config.bridge_port), BoundHandler)

    print(f"[bridge-server] listening on 0.0.0.0:{config.bridge_port}")
    print(f"[bridge-server] mode: {config.server_mode}")
    print(f"[bridge-server] workdir: {config.server_workdir}")
    print(f"[bridge-server] secret_fp={secret_fingerprint(config.shared_secret)}")
    print("[bridge-server] checks: configured deterministic commands + optional codex review")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[bridge-server] shutting down")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
