#!/usr/bin/env python3
"""Talimy Bridge Server

Server-side bridge that waits for laptop triggers, pulls latest code, runs deterministic
checks, optionally runs Codex review, and exposes JSON results over HTTP.
"""

from __future__ import annotations

import json
import os
import queue
import re
import shlex
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
CONFIG_PATH = BASE_DIR / "bridge_config.json"
STATE_DIR = BASE_DIR / ".bridge-state"
RESULTS_DIR = STATE_DIR / "results"


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
    def server_repo_path(self) -> Path:
        return Path(str(self.raw["server_repo_path"]))

    @property
    def server_codex(self) -> dict[str, Any]:
        return dict(self.raw.get("server_codex", {}))

    @property
    def server_checks(self) -> dict[str, list[str]]:
        return {k: list(v) for k, v in dict(self.raw.get("server_checks", {})).items()}


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


class BridgeServerState:
    def __init__(self, config: BridgeConfig) -> None:
        self.config = config
        self.jobs = JsonStore(RESULTS_DIR)
        self.q: queue.Queue[dict[str, Any]] = queue.Queue()

    def enqueue(self, payload: dict[str, Any]) -> None:
        self.q.put(payload)


def load_config() -> BridgeConfig:
    raw = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return BridgeConfig(raw=raw)


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


def detect_check_set(task: str, checks: dict[str, list[str]]) -> list[str]:
    task_l = task.lower()
    if any(token in task_l for token in ["api", "backend", "nest"]):
        return checks.get("api", checks.get("default", []))
    if any(token in task_l for token in ["web", "frontend", "next", "platform"]):
        return checks.get("web", checks.get("default", []))
    return checks.get("default", [])


def run_server_codex_review(trigger: dict[str, Any], config: BridgeConfig, repo_path: Path) -> dict[str, Any] | None:
    codex_cfg = config.server_codex
    if not codex_cfg.get("enabled", False):
        return None

    codex_bin = str(codex_cfg.get("binary", "codex"))
    timeout = int(codex_cfg.get("timeout_seconds", 300))

    prompt = f"""
Taskni tekshir: {trigger.get('task', '')}
Commit: {trigger.get('commit', '')}

Qilish kerak:
1. Oxirgi commit diffni ko'r: git diff HEAD~1 HEAD
2. Kodni review qil (bug, regressiya, xavfsizlik risk)
3. Mavjud test/lint natijalari asosida qisqa xulosa ber
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
        result = subprocess.run(
            [codex_bin, "--no-interactive", "-q", prompt],
            cwd=str(repo_path),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
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


def process_trigger(trigger: dict[str, Any], state: BridgeServerState) -> None:
    config = state.config
    repo_path = config.server_repo_path
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
        },
    )

    git_steps = [
        run_command("git fetch origin", repo_path),
        run_command(f"git checkout {shlex.quote(config.branch)}", repo_path),
        run_command(f"git pull --ff-only origin {shlex.quote(config.branch)}", repo_path),
    ]

    for step in git_steps:
        if step["returncode"] != 0:
            state.jobs.write(
                job_id,
                {
                    "status": "failure",
                    "tests_passed": False,
                    "errors": [f"git step failed: {step['command']}", step["stderr"].strip()],
                    "warnings": [],
                    "suggestions": ["Server repo path/branch and git auth ni tekshiring."],
                    "next_action": "fix_required",
                    "task": task,
                    "commit": trigger.get("commit"),
                    "job_id": job_id,
                    "stage": "git",
                    "git": git_steps,
                },
            )
            return

    checks = detect_check_set(task, config.server_checks)
    check_results: list[dict[str, Any]] = []
    check_errors: list[str] = []
    for cmd in checks:
        res = run_command(cmd, repo_path, timeout=1200)
        check_results.append(res)
        if res["returncode"] != 0:
            check_errors.append(f"{cmd} failed")
            if res["stderr"].strip():
                check_errors.append(res["stderr"].strip())
            break

    tests_passed = len(check_errors) == 0

    codex_review = run_server_codex_review(trigger, config, repo_path)

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
        "git": git_steps,
        "checks": check_results,
        "codex_review": codex_review,
        "finished_at": int(time.time()),
    }
    state.jobs.write(job_id, result_payload)


def worker_loop(state: BridgeServerState) -> None:
    while True:
        trigger = state.q.get()
        try:
            process_trigger(trigger, state)
        except Exception as exc:  # pragma: no cover - runtime safeguard
            job_id = str(trigger.get("job_id") or "unknown")
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

        self._json(404, {"status": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._authorized():
            self._json(401, {"status": "unauthorized"})
            return
        if self.path != "/trigger":
            self._json(404, {"status": "not_found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception as exc:
            self._json(400, {"status": "error", "message": f"invalid json: {exc}"})
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
        self._json(200, {"status": "triggered", "job_id": job_id})


def main() -> int:
    config = load_config()
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    state = BridgeServerState(config)
    worker = threading.Thread(target=worker_loop, args=(state,), daemon=True)
    worker.start()

    class BoundHandler(Handler):
        pass

    BoundHandler.state = state
    server = ThreadingHTTPServer(("0.0.0.0", config.bridge_port), BoundHandler)

    print(f"[bridge-server] listening on 0.0.0.0:{config.bridge_port}")
    print(f"[bridge-server] repo: {config.server_repo_path}")
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
