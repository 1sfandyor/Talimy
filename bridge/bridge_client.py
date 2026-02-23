#!/usr/bin/env python3
"""Talimy Bridge Client

Laptop-side bridge client that pushes to GitHub, notifies bridge server, waits for result,
and optionally helps pick the next task from docReja/Reja.md tracker table.
"""

from __future__ import annotations

import json
import hashlib
import os
import re
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from threading import Event, Thread
from typing import Any
from urllib import error, parse, request

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = BASE_DIR / "bridge_config.json"
LAST_RESULT_PATH = BASE_DIR / ".bridge-state" / "last_bridge_result.json"

REJA_ROW_RE = re.compile(
    r"^\|\s*(?P<task_no>2\.\d+)\s*\|\s*(?P<title>[^|]+?)\s*\|\s*(?P<status>[^|]+?)\s*\|",
    re.UNICODE,
)
TASK_NUMBER_RE = re.compile(r"\b(?P<phase>\d+)\.(?P<task>\d+)\b")
JSON_OBJECT_RE = re.compile(r"\{[\s\S]*\}")
UUID_RE = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


ENV_TOKEN_RE = re.compile(r"^\$\{([A-Z0-9_]+)\}$")
ANSI_RESET = "\x1b[0m"


def ansi_color(code: str, text: str) -> str:
    if os.environ.get("NO_COLOR"):
        return text
    return f"\x1b[{code}m{text}{ANSI_RESET}"


def resolve_config_path() -> Path:
    raw = os.environ.get("BRIDGE_CONFIG_PATH", "").strip()
    if not raw:
        if DEFAULT_CONFIG_PATH.exists():
            return DEFAULT_CONFIG_PATH
        laptop_cfg = BASE_DIR / "bridge_config.laptop.json"
        if laptop_cfg.exists():
            return laptop_cfg
        server_cfg = BASE_DIR / "bridge_config.server.json"
        if server_cfg.exists():
            return server_cfg
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
class Config:
    raw: dict[str, Any]

    @property
    def server_host(self) -> str:
        return str(self.raw["server_host"])

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
    def laptop_repo_path(self) -> Path:
        return Path(str(self.raw.get("laptop_repo_path", ".")))

    @property
    def tasks_file(self) -> Path:
        return Path(str(self.raw.get("tasks_file", "docReja/Reja.md")))

    @property
    def poll_interval_seconds(self) -> int:
        return int(self.raw.get("poll_interval_seconds", 5))

    @property
    def request_timeout_seconds(self) -> int:
        return int(self.raw.get("request_timeout_seconds", 15))

    @property
    def github_ci(self) -> dict[str, Any]:
        return dict(self.raw.get("github_ci", {}))

    @property
    def telegram(self) -> dict[str, Any]:
        return dict(self.raw.get("telegram", {}))

    @property
    def session_context(self) -> dict[str, Any]:
        return dict(self.raw.get("session_context", {}))

    @property
    def dokploy(self) -> dict[str, Any]:
        return dict(self.raw.get("dokploy", {}))

    @property
    def runtime_checks(self) -> dict[str, Any]:
        return dict(self.raw.get("runtime_checks", {}))

    @property
    def task_smoke_checks(self) -> dict[str, list[str]]:
        raw = dict(self.raw.get("task_smoke_checks", {}))
        return {str(k): [str(x) for x in list(v)] for k, v in raw.items() if isinstance(v, list)}

    @property
    def task_smoke_mapping(self) -> dict[str, str]:
        raw = dict(self.raw.get("task_smoke_mapping", {}))
        return {str(k): str(v) for k, v in raw.items()}

    @property
    def auto_fix(self) -> dict[str, Any]:
        return dict(self.raw.get("auto_fix", {}))

    @property
    def reja_auto_mark(self) -> dict[str, Any]:
        return dict(self.raw.get("reja_auto_mark", {}))

    @property
    def task_smoke_policy(self) -> dict[str, Any]:
        return dict(self.raw.get("task_smoke_policy", {}))

    @property
    def pre_push_checks(self) -> dict[str, list[str]]:
        raw = dict(self.raw.get("pre_push_checks", {}))
        return {str(k): [str(x) for x in list(v)] for k, v in raw.items() if isinstance(v, list)}

    @property
    def pre_push_mapping(self) -> dict[str, str]:
        raw = dict(self.raw.get("pre_push_mapping", {}))
        return {str(k): str(v) for k, v in raw.items()}

    @property
    def post_deploy_smoke_checks(self) -> dict[str, list[str]]:
        # backward-compatible fallback to task_smoke_checks
        raw = self.raw.get("post_deploy_smoke_checks", self.raw.get("task_smoke_checks", {}))
        raw = dict(raw)
        return {str(k): [str(x) for x in list(v)] for k, v in raw.items() if isinstance(v, list)}

    @property
    def post_deploy_smoke_mapping(self) -> dict[str, str]:
        raw = self.raw.get("post_deploy_smoke_mapping", self.raw.get("task_smoke_mapping", {}))
        raw = dict(raw)
        return {str(k): str(v) for k, v in raw.items()}

    @property
    def smoke_auth(self) -> dict[str, Any]:
        return dict(self.raw.get("smoke_auth", {}))

    @property
    def dynamic_smoke(self) -> dict[str, Any]:
        return dict(self.raw.get("dynamic_smoke", {}))


def load_config() -> Config:
    config_path = resolve_config_path()
    raw = json.loads(config_path.read_text(encoding="utf-8"))
    return Config(raw=expand_env_placeholders(raw))


def parse_json_object_from_text(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if not text:
        return None
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except Exception:
        pass
    m = JSON_OBJECT_RE.search(text)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def extract_first_uuid(text: str) -> str | None:
    if not text:
        return None
    m = UUID_RE.search(text)
    if not m:
        return None
    return m.group(0)


def secret_fingerprint(secret: str) -> str:
    if not secret:
        return "none"
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()[:12]


def client_log(channel: str, message: str) -> None:
    channel_l = channel.lower()
    channel_color = {
        "config": "36",          # cyan
        "hello": "32",           # green
        "context": "35",         # magenta
        "git": "34",             # blue
        "jobs": "95",            # bright magenta
        "bridge": "37",          # white
        "server-ack": "33",      # yellow
        "watch": "90",           # bright black
    }.get(channel_l)
    if channel_l.startswith("timeline:ci"):
        channel_color = "96"     # bright cyan
    elif channel_l.startswith("timeline:server"):
        channel_color = "93"     # bright yellow
    elif channel_l.startswith("timeline:"):
        channel_color = "94"     # bright blue

    left = ansi_color("38;5;45", "[LAPTOP]")   # turquoise
    right = ansi_color(channel_color or "37", f"[{channel}]")
    print(f"{left}{right} {message}")


def server_log_on_client(channel: str, message: str) -> None:
    channel_l = channel.lower()
    channel_color = {
        "bridge": "38;5;208",  # orange
        "ack": "38;5;208",     # orange
        "codex": "34",         # blue
    }.get(channel_l, "33")
    left = ansi_color("38;5;208", "[SERVER]")
    right = ansi_color(channel_color, f"[{channel}]")
    print(f"{left}{right} {message}")


def http_json(
    method: str,
    url: str,
    payload: dict[str, Any] | None,
    timeout: int,
    token: str,
) -> tuple[int, dict[str, Any]]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("X-Bridge-Token", token)
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else {"status": "http_error"}
        except Exception:
            parsed = {"status": "http_error", "body": body}
        return exc.code, parsed


def run_git(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=str(cwd), capture_output=True, text=True, encoding="utf-8", errors="replace")


def run_cmd(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=None if cwd is None else str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def run_shell(command: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    if os.name == "nt":
        return subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    return subprocess.run(
        command,
        cwd=str(cwd),
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def run_shell_or_direct(command: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    if os.name == "nt":
        m = re.match(r'^\s*(powershell(?:\.exe)?)\s+-NoProfile\s+-Command\s+"([\s\S]*)"\s*$', command, re.IGNORECASE)
        if m:
            exe = m.group(1)
            script = m.group(2)
            return run_cmd([exe, "-NoProfile", "-Command", script], cwd)
    return run_shell(command, cwd)


def current_commit(cwd: Path) -> str:
    res = run_git(["git", "rev-parse", "HEAD"], cwd)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or "git rev-parse failed")
    return res.stdout.strip()


def changed_files_for_commit(cwd: Path, commit: str) -> list[str]:
    res = run_git(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit], cwd)
    if res.returncode != 0:
        return []
    return [line.strip() for line in res.stdout.splitlines() if line.strip()]


def predict_ci_trigger_for_commit(cfg: Config, commit: str) -> dict[str, Any]:
    repo = cfg.laptop_repo_path
    files = changed_files_for_commit(repo, commit)
    if not files:
        return {"known": False, "expect_runs": True, "reason": "changed files aniqlanmadi", "files": []}

    normalized = [f.replace("\\", "/") for f in files]

    docs_only_prefixes = ("bridge/", "docReja/")
    docs_only_suffixes = (".md", ".txt")

    all_docs_like = all(
        p.startswith(docs_only_prefixes)
        or p.endswith(docs_only_suffixes)
        or p.startswith(".vscode/")
        or p.startswith(".idea/")
        for p in normalized
    )
    if all_docs_like:
        return {
            "known": True,
            "expect_runs": False,
            "reason": "docs/bridge-only commit (CI path filter trigger bo'lmasligi mumkin)",
            "files": normalized,
        }

    workflow_files = [p for p in normalized if p.startswith(".github/workflows/")]
    if workflow_files:
        return {
            "known": True,
            "expect_runs": True,
            "reason": "workflow files o'zgargan",
            "files": normalized,
        }

    # Conservative default: application/package code changes may trigger CI/CD.
    code_prefixes = ("apps/", "packages/", "tooling/")
    if any(p.startswith(code_prefixes) for p in normalized):
        return {
            "known": True,
            "expect_runs": True,
            "reason": "app/package/tooling code changes topildi",
            "files": normalized,
        }

    return {
        "known": False,
        "expect_runs": True,
        "reason": "commit pathlari bo'yicha CI trigger holati noaniq",
        "files": normalized,
    }


def push_commit(cfg: Config) -> str:
    repo = cfg.laptop_repo_path
    push = run_git(["git", "push", "origin", cfg.branch], repo)
    if push.returncode != 0:
        raise RuntimeError(push.stderr.strip() or push.stdout.strip() or "git push failed")
    return current_commit(repo)


def trigger_server(task: str, commit: str, cfg: Config, session_context: dict[str, Any] | None = None) -> str:
    job_id = uuid.uuid4().hex
    server = f"http://{cfg.server_host}:{cfg.bridge_port}"
    code, resp = http_json(
        "POST",
        f"{server}/trigger",
        {
            "task": task,
            "commit": commit,
            "job_id": job_id,
            "timestamp": int(time.time()),
            "session_context": session_context or {},
        },
        cfg.request_timeout_seconds,
        cfg.shared_secret,
    )
    if code != 200:
        raise RuntimeError(f"bridge trigger failed ({code}): {resp}")
    if resp.get("ack"):
        server_log_on_client("ack", f"[trigger] {resp['ack']}")
    return job_id


def bridge_hello(cfg: Config) -> dict[str, Any]:
    server = f"http://{cfg.server_host}:{cfg.bridge_port}"
    code, resp = http_json(
        "GET",
        f"{server}/hello?side=laptop",
        None,
        cfg.request_timeout_seconds,
        cfg.shared_secret,
    )
    if code != 200:
        raise RuntimeError(f"bridge hello failed ({code}): {resp}")
    return resp


def send_bridge_event(
    cfg: Config,
    *,
    job_id: str,
    event_type: str,
    task: str,
    commit: str,
    message: str,
    workflow: str = "",
    status: str = "",
    conclusion: str = "",
) -> dict[str, Any] | None:
    server = f"http://{cfg.server_host}:{cfg.bridge_port}"
    code, resp = http_json(
        "POST",
        f"{server}/event",
        {
            "job_id": job_id,
            "event_type": event_type,
            "task": task,
            "commit": commit,
            "message": message,
            "workflow": workflow,
            "status": status,
            "conclusion": conclusion,
            "timestamp": int(time.time()),
        },
        cfg.request_timeout_seconds,
        cfg.shared_secret,
    )
    if code == 200:
        ack = str(resp.get("ack", "")).strip()
        if ack:
            server_log_on_client("ack", ack)
        return resp
    client_log("bridge", f"event failed ({code}): {resp}")
    return None


def _detect_task_key(task: str, mapping: dict[str, Any]) -> str | None:
    task_l = task.lower()
    match = TASK_NUMBER_RE.search(task)
    if match:
        task_no = f"{match.group('phase')}.{match.group('task')}"
        phase_no = match.group("phase")
        for key in (task_no, f"{phase_no}.x", phase_no):
            if key in mapping:
                return key
    for token in ("api", "web", "platform"):
        if token in task_l and token in mapping:
            return token
    if "default" in mapping:
        return "default"
    return None


def _git_diff_excerpt_for_prompt(cfg: Config, max_chars: int = 6000) -> str:
    repo = cfg.laptop_repo_path
    chunks: list[str] = []
    cmds = [
        ["git", "status", "--short"],
        ["git", "show", "--stat", "--name-only", "--oneline", "-1"],
        ["git", "diff", "--unified=1", "HEAD~1", "HEAD"],
    ]
    for cmd in cmds:
        try:
            res = run_git(cmd, repo)
        except Exception:
            continue
        if res.returncode != 0:
            continue
        label = " ".join(cmd)
        out = (res.stdout or "").strip()
        if out:
            chunks.append(f"$ {label}\n{out}")
    joined = "\n\n".join(chunks).strip()
    if len(joined) > max_chars:
        joined = joined[: max_chars - 3] + "..."
    return joined


def _today_iso_date() -> str:
    return time.strftime("%Y-%m-%d")


def _select_task_command_set(
    task: str,
    *,
    checks: dict[str, list[str]],
    mapping: dict[str, str],
) -> tuple[str | None, list[str]]:
    if not checks:
        return None, []
    task_key = _detect_task_key(task, mapping) if mapping else None
    if task_key:
        smoke_key = mapping.get(task_key)
        if smoke_key and smoke_key in checks:
            return smoke_key, checks[smoke_key]
    task_l = task.lower()
    for key in ("api", "web", "platform", "default"):
        if key in checks and (key == "default" or key in task_l):
            return key, checks[key]
    return None, []


def _dynamic_smoke_forbidden(command: str) -> str | None:
    lowered = command.lower()
    forbidden_tokens = [
        "git push",
        "git pull",
        "git reset",
        "git checkout",
        "docker service update",
        "docker compose up",
        "rm -rf ",
    ]
    for token in forbidden_tokens:
        if token in lowered:
            return token
    return None


def _build_dynamic_smoke_prompt(task: str, stage: str, cfg: Config) -> str:
    diff_excerpt = _git_diff_excerpt_for_prompt(cfg, max_chars=8000) or "(git diff excerpt unavailable)"
    stage_rules = {
        "local_smoke": (
            "Stage = pre-push local smoke.\n"
            "Generate ONLY local deterministic commands (PowerShell-compatible) that validate the changed feature BEFORE push.\n"
            "Allowed examples: bun lint/typecheck/test commands, local scripts, file existence checks.\n"
            "Do NOT call remote deployed endpoints in this stage.\n"
        ),
        "post_deploy_smoke": (
            "Stage = post-deploy feature smoke.\n"
            "Generate remote API smoke commands (PowerShell-compatible curl commands) that validate the deployed feature.\n"
            "Use placeholders exactly where needed: {{BASE_URL}}, {{TENANT_ID}}, {{ACCESS_TOKEN}}.\n"
            "Prefer lightweight assertion-oriented smoke checks (GET list/get-by-id/health/report) and avoid destructive operations unless required.\n"
        ),
    }.get(
        stage,
        (
            f"Stage = {stage}.\n"
            "Generate deterministic validation commands appropriate for this stage.\n"
        ),
    )
    max_cmds = int(cfg.dynamic_smoke.get("max_commands", 4) or 4)
    return (
        "You are generating smoke-check shell commands for Talimy bridge automation.\n"
        "Before deciding commands, read and follow project rules from AGENTS.md, docReja/Reja.md, and docReja/Documentation.html.\n"
        "Respect AGENTS.md strict rules (best-practice, minimal-diff, tenant isolation awareness, no shortcuts).\n\n"
        f"Task: {task}\n"
        f"{stage_rules}\n"
        "Constraints:\n"
        "- Output JSON only.\n"
        f"- Return at most {max_cmds} commands.\n"
        "- Keep commands short and compact (prefer <= 500 chars each).\n"
        "- Avoid long inline PowerShell scripts unless absolutely necessary.\n"
        "- Prefer lightweight read-only checks; 2-4 commands are enough.\n"
        "- Commands must be safe for automation; no git push/pull/reset/checkout, no deploy commands.\n"
        "- If exact feature smoke cannot be inferred reliably, return a conservative but relevant smoke list and explain in notes.\n\n"
        "Return format (strict JSON, no markdown fences, no extra text):\n"
        "{\n"
        '  "commands": ["..."],\n'
        '  "notes": "short rationale"\n'
        "}\n\n"
        "Recent repo context (git excerpt):\n"
        f"{diff_excerpt}\n"
    )


def _generate_dynamic_smoke_commands(task: str, cfg: Config, stage: str) -> dict[str, Any]:
    dyn = cfg.dynamic_smoke
    if not bool(dyn.get("enabled", False)):
        return {"ok": False, "errors": ["dynamic smoke disabled"]}

    timeout = int(dyn.get("codex_timeout_seconds", cfg.auto_fix.get("codex_timeout_seconds", 900) or 900))
    prompt = _build_dynamic_smoke_prompt(task, stage, cfg)
    client_log("bridge", f"[{stage}] dynamic smoke generation start")
    try:
        res = run_local_codex_prompt(prompt, cfg, timeout_seconds=timeout)
    except FileNotFoundError:
        return {"ok": False, "errors": ["Local codex CLI topilmadi (dynamic smoke generation uchun)."]}

    if res.returncode != 0:
        detail = (res.stderr or res.stdout or "").strip()
        return {
            "ok": False,
            "errors": [f"Dynamic smoke generation codex failed (rc={res.returncode})", detail[:1500]],
        }

    stdout_text = res.stdout or ""
    parsed = parse_json_object_from_text(stdout_text)
    if not parsed:
        maybe_truncated = ('"commands"' in stdout_text) and not stdout_text.strip().endswith("}")
        return {
            "ok": False,
            "errors": [
                "Dynamic smoke generator JSON qaytarmadi." + (" (stdout truncated/invalid bo'lishi mumkin)" if maybe_truncated else ""),
                stdout_text.strip()[:1500],
            ],
        }

    raw_commands = parsed.get("commands", [])
    if not isinstance(raw_commands, list):
        return {"ok": False, "errors": ["Dynamic smoke generator `commands` list qaytarmadi."]}
    commands = [str(x).strip() for x in raw_commands if str(x).strip()]
    if not commands:
        return {"ok": False, "errors": ["Dynamic smoke generator bo'sh command list qaytardi."]}

    max_cmds = int(dyn.get("max_commands", 8) or 8)
    commands = commands[:max_cmds]
    for cmd in commands:
        bad = _dynamic_smoke_forbidden(cmd)
        if bad:
            return {"ok": False, "errors": [f"Dynamic smoke command taqiqlangan token ishlatdi: {bad}", cmd]}
        lowered = cmd.lower()
        if stage == "local_smoke" and "curl " in lowered and ("http://" in lowered or "https://" in lowered):
            return {"ok": False, "errors": ["Dynamic local_smoke remote curl command qaytardi (stage rule buzildi).", cmd]}
        if stage == "post_deploy_smoke":
            if "curl " in lowered and ("{{base_url}}" not in lowered):
                return {"ok": False, "errors": ["Dynamic post_deploy_smoke curl commandida {{BASE_URL}} placeholder yo'q.", cmd]}
        if len(cmd) > 900:
            return {"ok": False, "errors": ["Dynamic smoke command juda uzun (generatorni qisqaroq commandlar bilan qayta uring).", cmd[:900]]}

    notes = str(parsed.get("notes", "")).strip()
    client_log("bridge", f"[{stage}] dynamic smoke generated commands={len(commands)}")
    return {"ok": True, "commands": commands, "notes": notes}


def _run_command_set(
    *,
    task: str,
    cfg: Config,
    stage: str,
    checks: dict[str, list[str]],
    mapping: dict[str, str],
    missing_mapping_error: str,
    missing_mapping_suggestion: str,
    command_renderer: callable | None = None,
    event_job_id: str | None = None,
    event_commit: str | None = None,
) -> dict[str, Any] | None:
    def _maybe_repair_failed_smoke_command(
        *,
        failed_command: str,
        stderr_text: str,
        stdout_text: str,
    ) -> str | None:
        if stage not in {"post_deploy_smoke", "local_smoke"}:
            return None
        dyn = cfg.dynamic_smoke
        if not bool(dyn.get("enabled", False)):
            return None
        timeout = int(dyn.get("codex_timeout_seconds", cfg.auto_fix.get("codex_timeout_seconds", 900) or 900))
        prompt = (
            "You are repairing ONE failed Talimy bridge smoke command.\n"
            "Return STRICT JSON only: {\"fixed_command\":\"...\",\"reason\":\"...\"}\n"
            "Do not return markdown.\n"
            "Keep command safe (no git push/pull/reset/checkout, no deploy commands).\n"
            "Preserve placeholders if present: {{BASE_URL}}, {{TENANT_ID}}, {{ACCESS_TOKEN}}.\n"
            f"Stage: {stage}\n"
            f"Task: {task}\n"
            f"Failed command:\n{failed_command}\n\n"
            f"stderr excerpt:\n{stderr_text[:1200]}\n\n"
            f"stdout excerpt:\n{stdout_text[:1200]}\n"
        )
        client_log("bridge", f"[{stage}] smoke cmd repair start")
        try:
            fix_res = run_local_codex_prompt(prompt, cfg, timeout_seconds=timeout)
        except FileNotFoundError:
            return None
        if fix_res.returncode != 0:
            return None
        parsed_fix = parse_json_object_from_text(fix_res.stdout or "")
        if not parsed_fix:
            return None
        fixed_command = str(parsed_fix.get("fixed_command", "")).strip()
        if not fixed_command:
            return None
        bad = _dynamic_smoke_forbidden(fixed_command)
        if bad:
            client_log("bridge", f"[{stage}] smoke cmd repair rejected forbidden token={bad}")
            return None
        if stage == "post_deploy_smoke" and "curl " in fixed_command.lower() and "{{BASE_URL}}" not in fixed_command and "https://api.talimy.space" not in fixed_command.lower():
            client_log("bridge", f"[{stage}] smoke cmd repair rejected missing BASE_URL route context")
            return None
        client_log("bridge", f"[{stage}] smoke cmd repair applied")
        return fixed_command

    smoke_key, commands = _select_task_command_set(task, checks=checks, mapping=mapping)
    dynamic_meta: dict[str, Any] | None = None
    if not commands:
        generated = _generate_dynamic_smoke_commands(task, cfg, stage)
        if generated.get("ok"):
            commands = [str(x) for x in generated.get("commands", [])]
            smoke_key = f"dynamic:{stage}"
            dynamic_meta = {"generated": True, "notes": str(generated.get("notes", "")).strip()}
            client_log("jobs", f"{stage}_set={smoke_key} source=dynamic-codex commands={len(commands)}")
        elif generated.get("errors") and cfg.dynamic_smoke.get("enabled", False):
            # Keep explicit mapping policy behavior, but surface dynamic generation failure if it was enabled.
            dynamic_meta = {"generated": False, "errors": [str(x) for x in generated.get("errors", [])]}
    if not commands:
        policy = cfg.task_smoke_policy
        require_explicit = bool(policy.get("require_explicit_for_numbered_tasks", False))
        if not require_explicit:
            return None
        task_no = _extract_task_no(task)
        if task_no is None:
            return None
        result = {
            "status": "failure",
            "tests_passed": False,
            "errors": [missing_mapping_error.format(task_no=task_no)]
            + ([f"Dynamic smoke generation failed: {e}" for e in dynamic_meta.get("errors", [])] if dynamic_meta and dynamic_meta.get("errors") else []),
            "warnings": [],
            "suggestions": [missing_mapping_suggestion],
            "next_action": "fix_required",
            "stage": stage,
            "task": task,
            stage: {"check_set": None, "checks": []},
        }
        write_last_result(result)
        return result

    repo = cfg.laptop_repo_path
    if not (dynamic_meta and dynamic_meta.get("generated")):
        client_log("jobs", f"{stage}_set={smoke_key} source=explicit commands={len(commands)}")
    check_results: list[dict[str, Any]] = []
    errors: list[str] = []
    for command in commands:
        rendered = command_renderer(command) if command_renderer else command
        if stage == "post_deploy_smoke" and event_job_id:
            send_bridge_event(
                cfg,
                job_id=event_job_id,
                event_type="feature_smoke_status",
                task=task,
                commit=event_commit or "",
                workflow=str(smoke_key or "feature-smoke"),
                status="in_progress",
                message=f"Smoke cmd start: {rendered[:180]}",
            )
        client_log("bridge", f"[{stage}] start cmd={rendered}")
        started = time.time()
        res = run_shell_or_direct(rendered, repo)
        duration = round(time.time() - started, 2)
        check_results.append(
            {
                "command": rendered,
                "returncode": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "duration_seconds": duration,
            }
        )
        client_log("bridge", f"[{stage}] done rc={res.returncode} dur={duration}s")
        if stage == "post_deploy_smoke" and event_job_id:
            send_bridge_event(
                cfg,
                job_id=event_job_id,
                event_type="feature_smoke_status",
                task=task,
                commit=event_commit or "",
                workflow=str(smoke_key or "feature-smoke"),
                status="completed",
                conclusion="success" if res.returncode == 0 else "failure",
                message=f"Smoke cmd done rc={res.returncode} dur={duration}s: {rendered[:140]}",
            )
        if res.returncode != 0:
            stderr_text = (res.stderr or "").strip()
            stdout_text = (res.stdout or "").strip()
            repaired_command = _maybe_repair_failed_smoke_command(
                failed_command=rendered,
                stderr_text=stderr_text,
                stdout_text=stdout_text,
            )
            if repaired_command and repaired_command != rendered:
                if stage == "post_deploy_smoke" and event_job_id:
                    send_bridge_event(
                        cfg,
                        job_id=event_job_id,
                        event_type="feature_smoke_status",
                        task=task,
                        commit=event_commit or "",
                        workflow=str(smoke_key or "feature-smoke"),
                        status="in_progress",
                        message="Smoke cmd repaired by laptop Codex, retrying single command.",
                    )
                client_log("bridge", f"[{stage}] retry repaired cmd={repaired_command}")
                started2 = time.time()
                res2 = run_shell_or_direct(repaired_command, repo)
                duration2 = round(time.time() - started2, 2)
                check_results.append(
                    {
                        "command": repaired_command,
                        "returncode": res2.returncode,
                        "stdout": res2.stdout,
                        "stderr": res2.stderr,
                        "duration_seconds": duration2,
                        "repair_retry": True,
                    }
                )
                client_log("bridge", f"[{stage}] repaired cmd done rc={res2.returncode} dur={duration2}s")
                if stage == "post_deploy_smoke" and event_job_id:
                    send_bridge_event(
                        cfg,
                        job_id=event_job_id,
                        event_type="feature_smoke_status",
                        task=task,
                        commit=event_commit or "",
                        workflow=str(smoke_key or "feature-smoke"),
                        status="completed",
                        conclusion="success" if res2.returncode == 0 else "failure",
                        message=f"Smoke repaired cmd done rc={res2.returncode} dur={duration2}s",
                    )
                if res2.returncode == 0:
                    continue
                stderr_text = (res2.stderr or "").strip()
                stdout_text = (res2.stdout or "").strip()
                rendered = repaired_command
            errors.append(f"{stage} failed: {rendered}")
            detail = (stderr_text or stdout_text).strip()
            if detail:
                errors.append(detail[:1200])
            if stdout_text and stdout_text != detail:
                errors.append(f"stdout excerpt: {stdout_text[:800]}")
            if stderr_text and stderr_text != detail:
                errors.append(f"stderr excerpt: {stderr_text[:800]}")
            break

    ok = not errors
    warnings: list[str] = []
    if dynamic_meta and dynamic_meta.get("generated"):
        note = str(dynamic_meta.get("notes", "")).strip()
        warnings.append("Dynamic smoke commands generated by laptop Codex (explicit mapping topilmadi).")
        if note:
            warnings.append(f"Dynamic smoke note: {note}")

    result = {
        "status": "success" if ok else "failure",
        "tests_passed": ok,
        "errors": errors,
        "warnings": warnings,
        "suggestions": [] if ok else [f"{stage} xatosini tuzating yoki bridge config check commandlarini tekshiring."],
        "next_action": "proceed" if ok else "fix_required",
        "stage": stage,
        "task": task,
        stage: {
            "check_set": smoke_key,
            "checks": check_results,
            "dynamic": dynamic_meta or {"generated": False},
        },
    }
    write_last_result(result)
    return result


def run_local_task_smoke(task: str, cfg: Config) -> dict[str, Any] | None:
    return _run_command_set(
        task=task,
        cfg=cfg,
        stage="local_smoke",
        checks=cfg.pre_push_checks or cfg.task_smoke_checks,
        mapping=cfg.pre_push_mapping or cfg.task_smoke_mapping,
        missing_mapping_error="Task {task_no} uchun explicit pre-push smoke mapping topilmadi.",
        missing_mapping_suggestion="bridge_config.laptop.json ichiga pre_push_mapping va pre_push_checks qo'shing.",
    )


def _extract_task_no(task: str) -> str | None:
    m = TASK_NUMBER_RE.search(task)
    if not m:
        return None
    return f"{m.group('phase')}.{m.group('task')}"


def mark_reja_task_completed(task: str, cfg: Config) -> bool:
    mark_cfg = cfg.reja_auto_mark
    if not bool(mark_cfg.get("enabled", False)):
        return False
    task_no = _extract_task_no(task)
    if not task_no:
        return False
    path = cfg.tasks_file
    if not path.exists():
        return False

    target_date = str(mark_cfg.get("date_override", "")).strip() or _today_iso_date()
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    changed = False
    out_lines: list[str] = []
    row_re = re.compile(rf"^(\|\s*{re.escape(task_no)}\s*\|\s*[^|]+\|\s*)([^|]+?)(\s*\|\s*)([^|]+?)(\s*\|.*)$")
    for line in lines:
        m = row_re.match(line)
        if not m:
            out_lines.append(line)
            continue
        new_line = f"{m.group(1)}\U0001F7E2 Completed{m.group(3)}{target_date}{m.group(5)}"
        out_lines.append(new_line)
        changed = changed or (new_line != line)
    if not changed:
        return False
    path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    client_log("bridge", f"Reja marked completed: {task_no} ({path})")
    return True


def git_commit_if_needed(cfg: Config, message: str) -> bool:
    repo = cfg.laptop_repo_path
    status = run_git(["git", "status", "--porcelain"], repo)
    if status.returncode != 0:
        return False
    if not status.stdout.strip():
        return False
    add = run_git(["git", "add", str(cfg.tasks_file)], repo)
    if add.returncode != 0:
        return False
    commit = run_git(["git", "commit", "-m", message], repo)
    if commit.returncode != 0:
        return False
    client_log("git", f"committed: {message}")
    return True


def run_local_codex_prompt(prompt: str, cfg: Config, *, timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    repo = cfg.laptop_repo_path
    variants = [
        ["codex", "exec", "-s", "danger-full-access", "-a", "never", "--color", "never", prompt],
        ["codex", "exec", "--dangerously-bypass-approvals-and-sandbox", "--color", "never", prompt],
        ["codex", "-s", "danger-full-access", "-a", "never", "--no-interactive", "-q", prompt],
        ["codex", "-s", "danger-full-access", "-a", "never", "-q", prompt],
        ["codex", "-s", "danger-full-access", "-a", "never", prompt],
        ["codex", "--no-interactive", "-q", prompt],
        ["codex", "-q", prompt],
        ["codex", prompt],
    ]
    last: subprocess.CompletedProcess[str] | None = None
    for args in variants:
        try:
            res = subprocess.run(
                args,
                cwd=str(repo),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                encoding="utf-8",
                errors="replace",
            )
        except FileNotFoundError:
            raise
        last = res
        stderr_l = (res.stderr or "").lower()
        if res.returncode == 0:
            return res
        if "unexpected argument '--no-interactive'" in stderr_l or "unknown option '--no-interactive'" in stderr_l:
            continue
        if "unexpected argument '-q'" in stderr_l or "unknown option '-q'" in stderr_l:
            continue
        if "unrecognized subcommand 'exec'" in stderr_l:
            continue
        return res
    if last is None:
        raise RuntimeError("codex invocation failed")
    return last


def _git_status_short(cfg: Config) -> list[str]:
    res = run_git(["git", "status", "--short"], cfg.laptop_repo_path)
    if res.returncode != 0:
        return []
    return [line.rstrip() for line in (res.stdout or "").splitlines() if line.strip()]


def _git_changed_files(cfg: Config) -> list[str]:
    res = run_git(["git", "diff", "--name-only"], cfg.laptop_repo_path)
    if res.returncode != 0:
        return []
    return [line.strip() for line in (res.stdout or "").splitlines() if line.strip()]


def _git_diff_stat(cfg: Config, max_lines: int = 20) -> list[str]:
    res = run_git(["git", "diff", "--stat"], cfg.laptop_repo_path)
    if res.returncode != 0:
        return []
    lines = [line.rstrip() for line in (res.stdout or "").splitlines() if line.strip()]
    return lines[:max_lines]


def maybe_auto_fix_failure(task: str, cfg: Config, failure_result: dict[str, Any], attempt: int) -> bool:
    af = cfg.auto_fix
    if not bool(af.get("enabled", False)):
        return False

    max_retries = int(af.get("max_retries", 2))
    if attempt >= max_retries:
        return False

    timeout = int(af.get("codex_timeout_seconds", 900))
    stage = str(failure_result.get("stage", "unknown"))
    commit = str(failure_result.get("commit", ""))
    errors = [str(x) for x in failure_result.get("errors", [])]
    warnings = [str(x) for x in failure_result.get("warnings", [])][:5]
    suggestions = [str(x) for x in failure_result.get("suggestions", [])][:5]

    prompt = (
        f"Talimy bridge auto-fix cycle. Task: {task}\n"
        f"Failure stage: {stage}\n"
        f"Commit: {commit}\n\n"
        "Current structured result (source of truth):\n"
        f"{json.dumps(failure_result, ensure_ascii=False, indent=2)}\n\n"
        "Majburiy qoidalar:\n"
        "- AGENTS.md ni o'qi va qat'iy amal qil.\n"
        "- docReja/Reja.md va docReja/Documentation.html kontekstini hisobga ol.\n"
        "- Best-practice first, temporary workaround qilma.\n\n"
        "Qilish kerak:\n"
        "1. Xatoni tuzat (minimal-diff, best-practice)\n"
        "2. Lokal smoke/lint/typecheck zarur bo'lsa ishlat\n"
        "3. Kerakli o'zgarishlarni commit qil (inglizcha commit message)\n"
        "4. Push QILMA (bridge client push qiladi)\n"
        "5. FAQAT qisqa yakun yoz: nima tuzatding\n"
    )
    client_log("bridge", f"auto-fix start attempt={attempt + 1}/{max_retries} stage={stage}")
    before_status = _git_status_short(cfg)
    if before_status:
        client_log("bridge", f"auto-fix pre-status entries={len(before_status)}")
    else:
        client_log("bridge", "auto-fix pre-status clean")
    try:
        res = run_local_codex_prompt(prompt, cfg, timeout_seconds=timeout)
    except FileNotFoundError:
        client_log("bridge", "auto-fix skipped: local codex CLI topilmadi")
        return False
    if res.returncode != 0:
        err = (res.stderr or res.stdout or "").strip()
        client_log("bridge", f"auto-fix codex failed rc={res.returncode} {err[:240]}")
        return False
    after_status = _git_status_short(cfg)
    changed_files = _git_changed_files(cfg)
    diff_stat = _git_diff_stat(cfg)
    if changed_files:
        preview = ", ".join(changed_files[:8])
        if len(changed_files) > 8:
            preview += ", ..."
        client_log("bridge", f"auto-fix changed_files={len(changed_files)} [{preview}]")
    else:
        client_log("bridge", "auto-fix changed_files=0 (no unstaged diff)")
    if diff_stat:
        client_log("bridge", "auto-fix diffstat:")
        for line in diff_stat:
            client_log("bridge", f"  {line}")
    if after_status:
        client_log("bridge", f"auto-fix post-status entries={len(after_status)}")
    else:
        client_log("bridge", "auto-fix post-status clean")
    summary = (res.stdout or "").strip().splitlines()
    if summary:
        client_log("bridge", f"auto-fix summary: {summary[-1][:240]}")
    return True


def _select_dokploy_targets(task: str, dk: dict[str, Any]) -> list[dict[str, str]]:
    hooks = dk.get("hooks", {})
    if isinstance(hooks, dict) and hooks:
        normalized_hooks: dict[str, str] = {
            str(k): str(v).strip() for k, v in hooks.items() if str(v).strip()
        }
        mapping = dk.get("task_deploy_mapping", {})
        selected_aliases: list[str] = []
        if isinstance(mapping, dict):
            task_key = _detect_task_key(task, mapping)
            if task_key:
                mapped = mapping.get(task_key)
                if isinstance(mapped, list):
                    selected_aliases = [str(x) for x in mapped]
                elif isinstance(mapped, str):
                    selected_aliases = [mapped]

        if not selected_aliases:
            if "default" in normalized_hooks:
                selected_aliases = ["default"]
            elif "api" in normalized_hooks and "api" in task.lower():
                selected_aliases = ["api"]
            elif "web" in normalized_hooks and "web" in task.lower():
                selected_aliases = ["web"]
            elif "platform" in normalized_hooks and "platform" in task.lower():
                selected_aliases = ["platform"]

        targets: list[dict[str, str]] = []
        for alias in selected_aliases:
            hook = normalized_hooks.get(alias, "").strip()
            if hook:
                targets.append({"alias": alias, "url": hook})
        return targets

    # legacy single-hook fallback
    hook = str(dk.get("deploy_hook_url", "")).strip()
    if hook:
        return [{"alias": "default", "url": hook}]
    return []


def trigger_dokploy_deploy(task: str, commit: str, cfg: Config, job_id: str) -> dict[str, Any] | None:
    dk = cfg.dokploy
    if not bool(dk.get("enabled", False)):
        return None

    targets = _select_dokploy_targets(task, dk)
    if not targets:
        return {
            "status": "failure",
            "tests_passed": False,
            "errors": ["Dokploy deploy hook configured emas (hooks/deploy_hook_url topilmadi)."],
            "warnings": [],
            "suggestions": [
                "bridge_config.laptop.json -> dokploy.hooks yoki dokploy.deploy_hook_url ni to'ldiring."
            ],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "dokploy_deploy",
        }

    headers: dict[str, str] = {}
    secret = str(dk.get("auth_header_value", "")).strip()
    header_name = str(dk.get("auth_header_name", "")).strip()
    if secret and header_name:
        headers[header_name] = secret

    responses: list[dict[str, Any]] = []
    errors: list[str] = []
    timeout_s = int(dk.get("request_timeout_seconds", cfg.request_timeout_seconds))

    for target in targets:
        alias = target["alias"]
        hook = target["url"]
        workflow_name = f"Dokploy:{alias}"
        send_bridge_event(
            cfg,
            job_id=job_id,
            event_type="dokploy_status",
            task=task,
            commit=commit,
            message=f"{workflow_name} deploy hook yuborilyapti.",
            workflow=workflow_name,
            status="in_progress",
        )
        try:
            req = request.Request(hook, data=b"", method="POST")
            for k, v in headers.items():
                req.add_header(k, v)
            with request.urlopen(req, timeout=timeout_s) as resp:
                body = resp.read().decode("utf-8", errors="ignore")
                responses.append(
                    {
                        "alias": alias,
                        "response_status": resp.status,
                        "response_body": body[:1000],
                    }
                )
                send_bridge_event(
                    cfg,
                    job_id=job_id,
                    event_type="dokploy_status",
                    task=task,
                    commit=commit,
                    message=f"{workflow_name} deploy hook accepted.",
                    workflow=workflow_name,
                    status="completed",
                    conclusion="success",
                )
        except Exception as exc:
            errors.append(f"{alias}: {exc}")
            send_bridge_event(
                cfg,
                job_id=job_id,
                event_type="dokploy_status",
                task=task,
                commit=commit,
                message=f"{workflow_name} deploy hook xato bo'ldi, men uni tuzatib senga qayta yuboraman",
                workflow=workflow_name,
                status="completed",
                conclusion="failure",
            )

    if errors:
        return {
            "status": "failure",
            "tests_passed": False,
            "errors": [f"Dokploy deploy hook failed: {e}" for e in errors],
            "warnings": [],
            "suggestions": ["Dokploy hook URL/headerlar va mappingni tekshiring."],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "dokploy_deploy",
            "targets": [t["alias"] for t in targets],
            "responses": responses,
        }

    return {"status": "success", "targets": [t["alias"] for t in targets], "responses": responses}


def run_runtime_health_checks(task: str, commit: str, cfg: Config, job_id: str) -> dict[str, Any] | None:
    rc = cfg.runtime_checks
    if not bool(rc.get("enabled", False)):
        return None

    urls = [u for u in rc.get("urls", []) if isinstance(u, dict) and str(u.get("url", "")).strip()]
    if not urls:
        return None

    timeout_seconds = int(rc.get("timeout_seconds", 300))
    interval_seconds = int(rc.get("poll_interval_seconds", 5))
    request_timeout = int(rc.get("request_timeout_seconds", cfg.request_timeout_seconds))

    pending = {str(u.get("name") or u["url"]): dict(u) for u in urls}
    last_errors: dict[str, str] = {}
    started = time.time()

    for name in pending:
        send_bridge_event(
            cfg,
            job_id=job_id,
            event_type="runtime_status",
            task=task,
            commit=commit,
            message=f"{name} health check boshlandi.",
            workflow=name,
            status="queued",
        )

    while time.time() - started < timeout_seconds:
        completed_now: list[str] = []
        for name, item in list(pending.items()):
            url = str(item.get("url", ""))
            expect_status = int(item.get("expect_status", 200))
            try:
                req = request.Request(url, method="GET")
                with request.urlopen(req, timeout=request_timeout) as resp:
                    status_code = int(resp.status)
                    if status_code == expect_status:
                        send_bridge_event(
                            cfg,
                            job_id=job_id,
                            event_type="runtime_status",
                            task=task,
                            commit=commit,
                            message=f"{name} OK ({status_code})",
                            workflow=name,
                            status="completed",
                            conclusion="success",
                        )
                        completed_now.append(name)
                    else:
                        last_errors[name] = f"unexpected status {status_code}, expected {expect_status}"
            except Exception as exc:
                last_errors[name] = str(exc)

        for name in completed_now:
            pending.pop(name, None)

        if not pending:
            return {
                "status": "success",
                "checks": [{"name": str(u.get("name") or u["url"]), "url": u["url"]} for u in urls],
            }

        time.sleep(interval_seconds)

    for name in pending:
        send_bridge_event(
            cfg,
            job_id=job_id,
            event_type="runtime_status",
            task=task,
            commit=commit,
            message=f"{name} runtime check timeout/failure",
            workflow=name,
            status="completed",
            conclusion="failure",
        )
    return {
        "status": "failure",
        "tests_passed": False,
        "errors": [f"Runtime health check failed: {name}: {last_errors.get(name, 'timeout')}" for name in pending],
        "warnings": [],
        "suggestions": ["Dokploy logs va domain health endpointlarni tekshiring."],
        "next_action": "fix_required",
        "task": task,
        "commit": commit,
        "stage": "runtime_health",
    }


def _json_request(method: str, url: str, payload: dict[str, Any], timeout: int) -> tuple[int, dict[str, Any]]:
    return http_json(method, url, payload, timeout, token="")


def _discover_smoke_tenant_id(cfg: Config) -> str | None:
    auth_cfg = cfg.smoke_auth
    explicit_cmd = str(auth_cfg.get("tenant_id_query_command", "")).strip()
    commands: list[str] = []
    if explicit_cmd:
        commands.append(explicit_cmd)

    if os.name == "nt":
        commands.append(
            "if ($env:DATABASE_URL) { psql \"$env:DATABASE_URL\" -At -c \"select id from tenants where deleted_at is null order by created_at desc limit 1;\" }"
        )
    else:
        commands.append(
            "if [ -n \"$DATABASE_URL\" ]; then psql \"$DATABASE_URL\" -At -c \"select id from tenants where deleted_at is null order by created_at desc limit 1;\"; fi"
        )

    repo = cfg.laptop_repo_path
    for command in commands:
        if not command.strip():
            continue
        client_log("bridge", "smoke tenant discovery start")
        res = run_shell(command, repo)
        if res.returncode != 0:
            continue
        tenant_id = extract_first_uuid((res.stdout or "").strip()) or extract_first_uuid((res.stderr or "").strip())
        if tenant_id:
            client_log("bridge", f"smoke tenant discovery success tenant_id={tenant_id}")
            return tenant_id
    return None


def bootstrap_post_deploy_smoke_context(task: str, commit: str, cfg: Config, job_id: str) -> dict[str, Any]:
    auth_cfg = cfg.smoke_auth
    base_url = str(auth_cfg.get("base_url", "https://api.talimy.space")).rstrip("/")
    tenant_id = str(auth_cfg.get("tenant_id", os.environ.get("BRIDGE_SMOKE_TENANT_ID", ""))).strip()
    if not tenant_id:
        tenant_id = str(os.environ.get("BRIDGE_TENANT_ID", "")).strip()
    if not tenant_id:
        tenant_id = str(_discover_smoke_tenant_id(cfg) or "").strip()
    if not tenant_id:
        return {
            "ok": False,
            "errors": [
                "Smoke auth tenant_id topilmadi (smoke_auth.tenant_id / BRIDGE_SMOKE_TENANT_ID / DATABASE_URL orqali auto-discovery)."
            ],
        }

    register_path = str(auth_cfg.get("register_path", "/api/auth/register"))
    password = str(auth_cfg.get("password", "Password123!"))
    email_prefix = str(auth_cfg.get("email_prefix", "bridge-smoke"))
    full_name = str(auth_cfg.get("full_name", "Bridge Smoke Admin"))
    ts = int(time.time())
    email = f"{email_prefix}+{ts}@test-school.talimy.space"
    payload = {
        "fullName": full_name,
        "email": email,
        "password": password,
        "tenantId": tenant_id,
    }
    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="feature_smoke_status",
        task=task,
        commit=commit,
        message="Feature smoke auth bootstrap boshlandi.",
        workflow="feature-smoke-auth",
        status="in_progress",
    )
    code, resp = _json_request("POST", f"{base_url}{register_path}", payload, cfg.request_timeout_seconds)
    if code >= 400:
        return {"ok": False, "errors": [f"Smoke auth register failed ({code})", json.dumps(resp, ensure_ascii=False)[:1200]]}
    data = resp.get("data", {}) if isinstance(resp, dict) else {}
    access_token = str(data.get("accessToken", "")).strip() if isinstance(data, dict) else ""
    if not access_token:
        return {"ok": False, "errors": ["Smoke auth accessToken topilmadi", json.dumps(resp, ensure_ascii=False)[:1200]]}
    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="feature_smoke_status",
        task=task,
        commit=commit,
        message="Feature smoke auth token olindi.",
        workflow="feature-smoke-auth",
        status="completed",
        conclusion="success",
    )
    return {
        "ok": True,
        "BASE_URL": base_url,
        "TENANT_ID": tenant_id,
        "ACCESS_TOKEN": access_token,
        "EMAIL": email,
        "PASSWORD": password,
    }


def _render_smoke_command(command: str, ctx: dict[str, str]) -> str:
    out = command
    for key, value in ctx.items():
        out = out.replace(f"{{{{{key}}}}}", str(value))
    route_override = str(ctx.get("SCHEDULE_ROUTE_PATH", "")).strip()
    if route_override:
        base_url = str(ctx.get("BASE_URL", "")).rstrip("/")
        out = out.replace("{{BASE_URL}}/api/schedule", route_override)
        out = out.replace("{{BASE_URL}}/api/schedules", route_override)
        if base_url:
            out = out.replace(f"{base_url}/api/schedule", route_override)
            out = out.replace(f"{base_url}/api/schedules", route_override)
    return out


def _is_schedule_task(task: str) -> bool:
    return "schedule" in (task or "").lower()


def _probe_schedule_routes(ctx: dict[str, str], cfg: Config) -> dict[str, Any]:
    base_url = str(ctx.get("BASE_URL", "")).rstrip("/")
    tenant_id = str(ctx.get("TENANT_ID", "")).strip()
    token = str(ctx.get("ACCESS_TOKEN", "")).strip()
    if not base_url or not tenant_id or not token:
        return {"ok": False, "message": "missing context"}
    headers = {"Authorization": f"Bearer {token}"}
    probes: list[dict[str, Any]] = []
    for path in ("/api/schedule", "/api/schedules"):
        code, resp = _json_request(
            "GET",
            f"{base_url}{path}?tenantId={tenant_id}&page=1&limit=1",
            None,
            cfg.request_timeout_seconds,
            headers=headers,
        )
        ok = bool(isinstance(resp, dict) and resp.get("success") is True)
        probes.append(
            {
                "path": path,
                "http_status": code,
                "success": ok,
                "body_excerpt": json.dumps(resp, ensure_ascii=False)[:500],
            }
        )
    good = next((p for p in probes if p.get("http_status", 500) < 400 and p.get("success")), None)
    if good:
        return {"ok": True, "route": f"{base_url}{good['path']}", "probes": probes}
    return {"ok": False, "probes": probes}


def run_post_deploy_feature_smoke(task: str, commit: str, cfg: Config, job_id: str) -> dict[str, Any] | None:
    checks = cfg.post_deploy_smoke_checks
    mapping = cfg.post_deploy_smoke_mapping

    ctx_bootstrap = bootstrap_post_deploy_smoke_context(task, commit, cfg, job_id)
    if not ctx_bootstrap.get("ok"):
        result = {
            "status": "failure",
            "tests_passed": False,
            "errors": list(ctx_bootstrap.get("errors", [])),
            "warnings": [],
            "suggestions": ["Smoke auth bootstrap ni tekshiring (auth endpoint, tenantId)."],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "post_deploy_smoke",
        }
        write_last_result(result)
        return result

    ctx = {
        "BASE_URL": str(ctx_bootstrap["BASE_URL"]),
        "TENANT_ID": str(ctx_bootstrap["TENANT_ID"]),
        "ACCESS_TOKEN": str(ctx_bootstrap["ACCESS_TOKEN"]),
        "SMOKE_EMAIL": str(ctx_bootstrap.get("EMAIL", "")),
        "SMOKE_PASSWORD": str(ctx_bootstrap.get("PASSWORD", "")),
    }
    schedule_probe: dict[str, Any] | None = None
    if _is_schedule_task(task):
        schedule_probe = _probe_schedule_routes(ctx, cfg)
        if schedule_probe.get("ok") and schedule_probe.get("route"):
            ctx["SCHEDULE_ROUTE_PATH"] = str(schedule_probe["route"])
            client_log("bridge", f"schedule route probe selected {ctx['SCHEDULE_ROUTE_PATH']}")
        else:
            client_log("bridge", "schedule route probe found no success route")
    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="feature_smoke_status",
        task=task,
        commit=commit,
        message="Feature smoke boshlandi.",
        workflow="feature-smoke",
        status="queued",
    )
    result = _run_command_set(
        task=task,
        cfg=cfg,
        stage="post_deploy_smoke",
        checks=checks,
        mapping=mapping,
        missing_mapping_error="Task {task_no} uchun explicit post-deploy feature smoke mapping topilmadi.",
        missing_mapping_suggestion="bridge_config.laptop.json ichiga post_deploy_smoke_mapping/checks qo'shing.",
        command_renderer=lambda cmd: _render_smoke_command(cmd, ctx),
        event_job_id=job_id,
        event_commit=commit,
    )
    if result is None:
        return None
    if schedule_probe:
        result.setdefault("warnings", []).extend(
            [
                f"schedule route probe {p.get('path')}: http={p.get('http_status')} success={p.get('success')}"
                for p in schedule_probe.get("probes", [])
                if isinstance(p, dict)
            ]
        )
        if result.get("next_action") != "proceed" and not schedule_probe.get("ok"):
            for p in schedule_probe.get("probes", []):
                if isinstance(p, dict) and p.get("body_excerpt"):
                    result.setdefault("errors", []).append(f"{p.get('path')} body: {p.get('body_excerpt')}")
                    break
    smoke_key = str((result.get("post_deploy_smoke") or {}).get("check_set") or "feature-smoke")
    ok = result.get("next_action") == "proceed"
    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="feature_smoke_status",
        task=task,
        commit=commit,
        message=f"Feature smoke {'success' if ok else 'failure'} ({smoke_key}).",
        workflow=smoke_key,
        status="completed",
        conclusion="success" if ok else "failure",
    )
    return result


def repo_slug_from_git_remote(repo: Path) -> str | None:
    remote = run_git(["git", "remote", "get-url", "origin"], repo)
    if remote.returncode != 0:
        return None
    url = remote.stdout.strip()
    if not url:
        return None
    # https://github.com/owner/repo(.git)
    m = re.search(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?$", url)
    if not m:
        return None
    return f"{m.group('owner')}/{m.group('repo')}"


def write_last_result(payload: dict[str, Any]) -> None:
    LAST_RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAST_RESULT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def read_last_result() -> dict[str, Any] | None:
    if not LAST_RESULT_PATH.exists():
        return None
    try:
        data = json.loads(LAST_RESULT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _extract_text_from_message_content(content: Any) -> str:
    parts: list[str] = []
    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    elif isinstance(content, str) and content.strip():
        parts.append(content.strip())
    return "\n".join(parts).strip()


def resolve_session_jsonl_path(sc: dict[str, Any]) -> Path | None:
    raw_path = str(sc.get("path", "")).strip()
    if raw_path:
        path = Path(os.path.expandvars(os.path.expanduser(raw_path)))
        return path

    session_id = str(sc.get("session_id", "")).strip().lower()
    if not session_id:
        return None

    sessions_root = Path(os.path.expandvars(os.path.expanduser(str(sc.get("sessions_root", "~/.codex/sessions")))))
    if not sessions_root.exists():
        return sessions_root / f"*{session_id}*.jsonl"

    matches = sorted(
        [p for p in sessions_root.rglob("*.jsonl") if session_id in p.name.lower()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else sessions_root / f"*{session_id}*.jsonl"


def build_session_context_excerpt(
    cfg: Config,
    *,
    session_id_override: str | None = None,
    disable_session_context: bool = False,
) -> dict[str, Any] | None:
    sc = dict(cfg.session_context)
    if disable_session_context:
        return None
    if session_id_override:
        sc["enabled"] = True
        sc.pop("path", None)
        sc["session_id"] = session_id_override
    if not bool(sc.get("enabled", False)):
        return None

    path = resolve_session_jsonl_path(sc)
    if path is None:
        return None
    if not path.exists():
        return {
            "enabled": True,
            "source_path": str(path),
            "error": "session file not found",
            "excerpt": "",
        }

    max_messages = int(sc.get("max_messages", 12))
    max_chars = int(sc.get("max_chars", 4000))
    include_roles = {str(x).strip() for x in sc.get("roles", ["user", "assistant"]) if str(x).strip()}

    extracted: list[dict[str, str]] = []
    try:
        for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                row = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            row_type = str(row.get("type", ""))
            payload = row.get("payload", {})
            if not isinstance(payload, dict):
                continue

            role: str | None = None
            text: str = ""
            if row_type == "response_item" and payload.get("type") == "message":
                role_val = payload.get("role")
                role = str(role_val) if isinstance(role_val, str) else None
                text = _extract_text_from_message_content(payload.get("content"))
            elif row_type == "event_msg":
                evt = str(payload.get("type", ""))
                if evt == "user_message":
                    role = "user"
                    text = str(payload.get("message", "")).strip()

            if not role or role not in include_roles or not text:
                continue
            extracted.append({"role": role, "text": text})
    except Exception as exc:
        return {
            "enabled": True,
            "source_path": str(path),
            "error": f"session read failed: {exc}",
            "excerpt": "",
        }

    extracted = extracted[-max_messages:]
    lines: list[str] = []
    remaining = max_chars
    for item in reversed(extracted):
        block = f"{item['role'].upper()}: {item['text']}"
        if len(block) > remaining:
            block = block[: max(0, remaining - 3)] + "..."
        if block:
            lines.append(block)
            remaining -= len(block) + 2
        if remaining <= 0:
            break
    lines.reverse()

    return {
        "enabled": True,
        "source_path": str(path),
        "message_count": len(extracted),
        "excerpt": "\n\n".join(lines),
    }


def wait_for_github_ci(commit: str, task: str, cfg: Config, job_id: str) -> dict[str, Any] | None:
    ci_cfg = cfg.github_ci
    if not bool(ci_cfg.get("enabled", False)):
        return None

    repo = cfg.laptop_repo_path
    repo_slug = str(ci_cfg.get("repo", "")).strip() or repo_slug_from_git_remote(repo)
    if not repo_slug:
        return {
            "status": "failure",
            "tests_passed": False,
            "errors": ["GitHub repo slug aniqlanmadi (origin remote)."],
            "warnings": [],
            "suggestions": ["bridge_config.json ichiga github_ci.repo = \"owner/repo\" qo'shing."],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "github_ci",
        }

    timeout_seconds = int(ci_cfg.get("timeout_seconds", 1800))
    interval_seconds = int(ci_cfg.get("poll_interval_seconds", cfg.poll_interval_seconds))
    no_run_grace_seconds = int(ci_cfg.get("no_run_grace_seconds", 45))
    require_runs = bool(ci_cfg.get("require_runs", False))
    watch_workflows = {str(x).strip() for x in ci_cfg.get("workflows", []) if str(x).strip()}
    prediction = predict_ci_trigger_for_commit(cfg, commit)
    if prediction.get("known") and not prediction.get("expect_runs"):
        msg = (
            "Commit pathlari bo'yicha GitHub CI trigger kutilmaydi "
            f"({prediction.get('reason', 'path prediction')}); CI skip qilinmoqda"
        )
        send_bridge_event(
            cfg,
            job_id=job_id,
            event_type="ci_status",
            task=task,
            commit=commit,
            message=msg,
            workflow="github-ci",
            status="completed",
            conclusion="skipped",
        )
        return {
            "status": "success",
            "tests_passed": True,
            "errors": [],
            "warnings": [msg],
            "suggestions": [],
            "next_action": "proceed",
            "task": task,
            "commit": commit,
            "stage": "github_ci",
            "github_ci": {
                "repo": repo_slug,
                "runs": [],
                "skipped_no_runs": True,
                "path_prediction": prediction,
            },
        }

    try:
        gh_check = run_cmd(["gh", "--version"], repo)
    except FileNotFoundError:
        return {
            "status": "failure",
            "tests_passed": False,
            "errors": ["GitHub CLI (gh) topilmadi (PATH)."],
            "warnings": [],
            "suggestions": [
                "Laptopga GitHub CLI o'rnating: https://cli.github.com/",
                "O'rnatilgandan keyin yangi terminal oching va `gh auth status` ni tekshiring.",
            ],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "github_ci",
        }
    if gh_check.returncode != 0:
        return {
            "status": "failure",
            "tests_passed": False,
            "errors": ["GitHub CLI (gh) ishlamadi.", gh_check.stderr.strip() or gh_check.stdout.strip()],
            "warnings": [],
            "suggestions": ["`gh auth status` ni tekshiring va login qiling."],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "github_ci",
        }

    started = time.time()
    dots = 0
    last_runs: list[dict[str, Any]] = []
    announced_states: dict[str, str] = {}
    while time.time() - started < timeout_seconds:
        cmd = [
            "gh",
            "run",
            "list",
            "--repo",
            repo_slug,
            "--commit",
            commit,
            "--limit",
            "20",
            "--json",
            "databaseId,workflowName,status,conclusion,url,headSha,displayTitle",
        ]
        try:
            res = run_cmd(cmd, repo)
        except FileNotFoundError:
            return {
                "status": "failure",
                "tests_passed": False,
                "errors": ["GitHub CLI (gh) topilmadi (PATH)."],
                "warnings": [],
                "suggestions": [
                    "Laptopga GitHub CLI o'rnating: https://cli.github.com/",
                    "O'rnatilgandan keyin yangi terminal oching va `gh auth status` ni tekshiring.",
                ],
                "next_action": "fix_required",
                "task": task,
                "commit": commit,
                "stage": "github_ci",
            }
        if res.returncode != 0:
            return {
                "status": "failure",
                "tests_passed": False,
                "errors": ["GitHub CI holatini olishda xato (gh run list).", res.stderr.strip() or res.stdout.strip()],
                "warnings": [],
                "suggestions": ["Laptopda gh CLI login/auth ni tekshiring: gh auth status"],
                "next_action": "fix_required",
                "task": task,
                "commit": commit,
                "stage": "github_ci",
            }

        try:
            runs = json.loads(res.stdout or "[]")
        except json.JSONDecodeError:
            runs = []
        runs = [r for r in runs if str(r.get("headSha", "")).startswith(commit)]
        if watch_workflows:
            runs = [r for r in runs if str(r.get("workflowName", "")) in watch_workflows]
        last_runs = runs
        for run in runs:
            run_id = str(run.get("databaseId", ""))
            workflow = str(run.get("workflowName", ""))
            status = str(run.get("status", ""))
            conclusion = str(run.get("conclusion", ""))
            signature = f"{status}|{conclusion}"
            if announced_states.get(run_id) == signature:
                continue
            announced_states[run_id] = signature

            if status != "completed":
                msg = f"{workflow} holati: {status}"
            elif str(conclusion).lower() == "success":
                msg = f"{workflow} success bo'ldi"
            else:
                msg = f"{workflow} xato bo'ldi, men uni tuzatib senga qayta yuboraman"

            send_bridge_event(
                cfg,
                job_id=job_id,
                event_type="ci_status",
                task=task,
                commit=commit,
                message=msg,
                workflow=workflow,
                status=status,
                conclusion=conclusion,
            )

        if runs:
            pending = [r for r in runs if str(r.get("status", "")) != "completed"]
            if not pending:
                failed = [
                    r
                    for r in runs
                    if str(r.get("conclusion", "")).lower() not in {"success", "skipped", "neutral"}
                ]
                if failed:
                    return {
                        "status": "failure",
                        "tests_passed": False,
                        "errors": [
                            f"GitHub CI failed: {r.get('workflowName')} ({r.get('conclusion')})"
                            for r in failed
                        ],
                        "warnings": [],
                        "suggestions": [
                            "gh run view <run-id> --log-failed bilan CI logni ko'ring.",
                            "Xatoni tuzatib qayta commit/push qiling.",
                        ],
                        "next_action": "fix_required",
                        "task": task,
                        "commit": commit,
                        "stage": "github_ci",
                        "github_ci": {"repo": repo_slug, "runs": runs},
                    }
                return {
                    "status": "success",
                    "tests_passed": True,
                    "errors": [],
                    "warnings": [],
                    "suggestions": [],
                    "next_action": "proceed",
                    "task": task,
                    "commit": commit,
                    "stage": "github_ci",
                    "github_ci": {"repo": repo_slug, "runs": runs},
                }
        else:
            elapsed = time.time() - started
            if elapsed >= no_run_grace_seconds:
                msg = (
                    "Commit uchun GitHub Actions run topilmadi (path filter yoki trigger yo'q), "
                    "keyingi bosqichga o'tyapman"
                )
                send_bridge_event(
                    cfg,
                    job_id=job_id,
                    event_type="ci_status",
                    task=task,
                    commit=commit,
                    message=msg,
                    workflow="github-ci",
                    status="completed",
                    conclusion="skipped",
                )
                if require_runs:
                    return {
                        "status": "failure",
                        "tests_passed": False,
                        "errors": ["GitHub CI run topilmadi (grace timeout)."],
                        "warnings": [],
                        "suggestions": [
                            "Workflow trigger/path filtersni tekshiring.",
                            "Agar bu task CI trigger qilmasligi normal bo'lsa github_ci.require_runs=false qiling.",
                        ],
                        "next_action": "fix_required",
                        "task": task,
                        "commit": commit,
                        "stage": "github_ci",
                        "github_ci": {"repo": repo_slug, "runs": [], "path_prediction": prediction},
                    }
                return {
                    "status": "success",
                    "tests_passed": True,
                    "errors": [],
                    "warnings": ["GitHub CI run topilmadi; CI bosqichi skip qilindi."],
                    "suggestions": [],
                    "next_action": "proceed",
                    "task": task,
                    "commit": commit,
                    "stage": "github_ci",
                    "github_ci": {"repo": repo_slug, "runs": [], "skipped_no_runs": True, "path_prediction": prediction},
                }

        dots = (dots + 1) % 4
        print(f"\r[bridge-client] waiting for GitHub CI{'.' * dots}   ", end="", flush=True)
        time.sleep(interval_seconds)

    return {
        "status": "failure",
        "tests_passed": False,
        "errors": ["GitHub CI wait timeout."],
        "warnings": [],
        "suggestions": ["GitHub Actions run holatini tekshiring (gh run list / GitHub UI)."],
        "next_action": "fix_required",
        "task": task,
        "commit": commit,
        "stage": "github_ci",
        "github_ci": {"repo": repo_slug, "runs": last_runs, "path_prediction": prediction},
    }


def wait_for_result(job_id: str, cfg: Config, timeout_seconds: int = 900) -> dict[str, Any] | None:
    server = f"http://{cfg.server_host}:{cfg.bridge_port}"
    started = time.time()
    dots = 0
    while time.time() - started < timeout_seconds:
        code, resp = http_json(
            "GET",
            f"{server}/result?job_id={parse.quote(job_id)}",
            None,
            cfg.request_timeout_seconds,
            cfg.shared_secret,
        )
        if code == 200:
            stage = str(resp.get("stage", "")).strip().lower()
            status = str(resp.get("status", "")).strip().lower()
            if stage == "completed" or status in {"success", "failure", "error"}:
                write_last_result(resp)
                print("\n[bridge-client] result received")
                return resp
            dots = (dots + 1) % 4
            print(f"\r[bridge-client] waiting for server result{'.' * dots}   ", end="", flush=True)
            time.sleep(cfg.poll_interval_seconds)
            continue
        if code not in (404,):
            print(f"\n[bridge-client] unexpected response {code}: {resp}")
        dots = (dots + 1) % 4
        print(f"\r[bridge-client] waiting for server result{'.' * dots}   ", end="", flush=True)
        time.sleep(cfg.poll_interval_seconds)
    print("\n[bridge-client] timeout waiting for result")
    return None


def get_bridge_events(job_id: str, cfg: Config) -> dict[str, Any]:
    server = f"http://{cfg.server_host}:{cfg.bridge_port}"
    code, resp = http_json(
        "GET",
        f"{server}/events?job_id={parse.quote(job_id)}",
        None,
        cfg.request_timeout_seconds,
        cfg.shared_secret,
    )
    if code != 200:
        raise RuntimeError(f"bridge events failed ({code}): {resp}")
    return resp


def watch_bridge_events(
    job_id: str,
    cfg: Config,
    timeout_seconds: int = 1800,
    *,
    stop_event: Event | None = None,
    label: str = "",
) -> int:
    started = time.time()
    seen = 0
    dots = 0
    prefix = f"[{label}] " if label else ""
    while time.time() - started < timeout_seconds:
        if stop_event is not None and stop_event.is_set():
            client_log("watch", f"{prefix.strip() or 'events'} stopped")
            return 0
        try:
            payload = get_bridge_events(job_id, cfg)
        except Exception as exc:
            client_log("watch", f"{prefix.strip() or 'events'} error: {exc}")
            time.sleep(cfg.poll_interval_seconds)
            continue

        events = list(payload.get("events", []))
        if len(events) > seen:
            for event in events[seen:]:
                ts = event.get("timestamp", "")
                event_type = event.get("event_type", "")
                workflow = event.get("workflow", "")
                status = event.get("status", "")
                conclusion = event.get("conclusion", "")
                message = event.get("message", "")
                parts = [str(ts)]
                if workflow:
                    parts.append(str(workflow))
                if status:
                    parts.append(f"status={status}")
                if conclusion:
                    parts.append(f"conclusion={conclusion}")
                if message:
                    parts.append(f"- {message}")
                timeline_channel = f"timeline:{label}" if label else "timeline"
                client_log(timeline_channel, " | ".join(parts))
            seen = len(events)
        else:
            dots = (dots + 1) % 4
            print(f"\r[LAPTOP][watch] {prefix}watching events{'.' * dots}   ", end="", flush=True)
        time.sleep(cfg.poll_interval_seconds)

    client_log("watch", f"{prefix.strip() or 'events'} timeout")
    return 0


def send_telegram_notification(result: dict[str, Any], cfg: Config) -> None:
    tg = cfg.telegram
    if not bool(tg.get("enabled", False)):
        return

    bot_token = str(tg.get("bot_token", "")).strip()
    chat_id = str(tg.get("chat_id", "")).strip()
    if not bot_token or not chat_id:
        return

    status = str(result.get("status", "unknown")).upper()
    task = str(result.get("task", ""))
    commit = str(result.get("commit", ""))[:12]
    next_action = str(result.get("next_action", "unknown"))
    stage = str(result.get("stage", ""))
    errors = [str(x) for x in result.get("errors", [])][:5]
    check_set = str(result.get("check_set", ""))

    lines = [
        f"Talimy Bridge: {status}",
        f"Task: {task}",
        f"Commit: {commit}",
        f"Stage: {stage}",
    ]
    if check_set:
        lines.append(f"Check set: {check_set}")
    lines.append(f"Next action: {next_action}")
    if errors:
        lines.append("Errors:")
        lines.extend([f"- {e}" for e in errors])

    payload = {"chat_id": chat_id, "text": "\n".join(lines)}
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        http_json("POST", url, payload, cfg.request_timeout_seconds, token="")
    except Exception:
        return


def run_push_ci_server_flow(
    task: str,
    cfg: Config,
    *,
    watch: bool = False,
    session_id_override: str | None = None,
    disable_session_context: bool = False,
) -> int:
    smoke_result = run_local_task_smoke(task, cfg)
    if smoke_result is not None and smoke_result.get("next_action") != "proceed":
        send_telegram_notification(smoke_result, cfg)
        return summarize_result(smoke_result)

    hello = bridge_hello(cfg)
    hello_reply = str(hello.get("reply") or "").strip()
    hello_src = str(hello.get("reply_source") or "").strip()
    msg = hello.get("message", "ok")
    if hello_reply:
        client_log("hello", msg)
        if hello_src == "server_codex":
            server_log_on_client("codex", hello_reply)
        else:
            server_log_on_client("bridge", f"hello reply source={hello_src} | {hello_reply}")
    else:
        client_log("hello", str(msg))
    session_context = build_session_context_excerpt(
        cfg,
        session_id_override=session_id_override,
        disable_session_context=disable_session_context,
    )
    if session_context and session_context.get("excerpt"):
        client_log("context", f"session context loaded ({session_context.get('message_count', 0)} messages)")
    commit = push_commit(cfg)
    client_log("git", f"pushed commit={commit[:12]}")

    ci_job_id = f"ci-{uuid.uuid4().hex}"
    client_log("jobs", "ci watch started")
    send_bridge_event(
        cfg,
        job_id=ci_job_id,
        event_type="hello",
        task=task,
        commit=commit,
        message="Laptop Codex bridge ulandi, CI ni kuzatishni boshlayman.",
    )

    ci_watch_stop: Event | None = None
    ci_watch_thread: Thread | None = None
    if watch:
        ci_watch_stop = Event()
        ci_watch_thread = Thread(
            target=watch_bridge_events,
            args=(ci_job_id, cfg),
            kwargs={"stop_event": ci_watch_stop, "label": "ci"},
            daemon=True,
        )
        ci_watch_thread.start()

    ci_result = wait_for_github_ci(commit, task, cfg, ci_job_id)
    if ci_watch_stop is not None:
        ci_watch_stop.set()
    if ci_watch_thread is not None:
        ci_watch_thread.join(timeout=2)
    if ci_result is not None:
        print("")
        if ci_result.get("next_action") != "proceed":
            write_last_result(ci_result)
            send_telegram_notification(ci_result, cfg)
            return summarize_result(ci_result)

    deploy_job_id = f"deploy-{uuid.uuid4().hex}"
    client_log("jobs", "deploy stage started")
    dokploy_result = trigger_dokploy_deploy(task, commit, cfg, deploy_job_id)
    if dokploy_result is not None and dokploy_result.get("status") == "failure":
        write_last_result(dokploy_result)
        send_telegram_notification(dokploy_result, cfg)
        return summarize_result(dokploy_result)

    runtime_result = run_runtime_health_checks(task, commit, cfg, deploy_job_id)
    if runtime_result is not None and runtime_result.get("status") == "failure":
        write_last_result(runtime_result)
        send_telegram_notification(runtime_result, cfg)
        return summarize_result(runtime_result)

    job_id = trigger_server(task, commit, cfg, session_context=session_context)
    client_log("jobs", "server runtime checks queued")
    ci_status_text = "completed"
    ci_conclusion = "success"
    ci_message = "GitHub CI success bo'ldi, endi server tekshiruvi boshlandi."
    if ci_result is not None:
        ci_info = ci_result.get("github_ci", {}) if isinstance(ci_result.get("github_ci"), dict) else {}
        if ci_info.get("skipped_no_runs"):
            ci_conclusion = "skipped"
            ci_message = "GitHub CI run topilmadi (skip), endi server tekshiruvi boshlandi."

    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="ci_status",
        task=task,
        commit=commit,
        message=ci_message,
        workflow="GitHub Actions",
        status=ci_status_text,
        conclusion=ci_conclusion,
    )
    client_log("bridge", "triggered server checks")

    srv_watch_stop: Event | None = None
    srv_watch_thread: Thread | None = None
    if watch:
        srv_watch_stop = Event()
        srv_watch_thread = Thread(
            target=watch_bridge_events,
            args=(job_id, cfg),
            kwargs={"stop_event": srv_watch_stop, "label": "server"},
            daemon=True,
        )
        srv_watch_thread.start()

    result = wait_for_result(job_id, cfg)
    if srv_watch_stop is not None:
        srv_watch_stop.set()
    if srv_watch_thread is not None:
        srv_watch_thread.join(timeout=2)
    if result is None:
        timeout_result = {
            "status": "failure",
            "tests_passed": False,
            "errors": ["Bridge server result timeout."],
            "warnings": [],
            "suggestions": ["Server bridge logsini tekshiring."],
            "next_action": "fix_required",
            "task": task,
            "commit": commit,
            "stage": "bridge_server",
            "job_id": job_id,
        }
        write_last_result(timeout_result)
        send_telegram_notification(timeout_result, cfg)
        return summarize_result(timeout_result)

    if ci_result is not None:
        result["github_ci"] = ci_result.get("github_ci", {})
        write_last_result(result)
    if result.get("next_action") == "proceed":
        feature_smoke_result = run_post_deploy_feature_smoke(task, commit, cfg, job_id)
        if feature_smoke_result is not None:
            if ci_result is not None:
                feature_smoke_result["github_ci"] = ci_result.get("github_ci", {})
            send_telegram_notification(feature_smoke_result, cfg)
            return summarize_result(feature_smoke_result)
    send_telegram_notification(result, cfg)
    return summarize_result(result)


def _maybe_mark_reja_and_push(task: str, cfg: Config) -> None:
    if not mark_reja_task_completed(task, cfg):
        return
    task_no = _extract_task_no(task) or "task"
    msg = f"docs(reja): mark {task_no} completed"
    if not git_commit_if_needed(cfg, msg):
        return
    try:
        commit = push_commit(cfg)
        client_log("git", f"pushed reja mark commit={commit[:12]}")
    except Exception as exc:
        client_log("bridge", f"reja mark push failed: {exc}")


def run_task_pipeline_with_retries(
    task: str,
    cfg: Config,
    *,
    watch: bool = False,
    session_id_override: str | None = None,
    disable_session_context: bool = False,
) -> int:
    af = cfg.auto_fix
    max_attempts = max(1, int(af.get("max_retries", 2)) + 1) if bool(af.get("enabled", False)) else 1

    for attempt in range(max_attempts):
        current_cfg = load_config()
        if attempt > 0:
            client_log("jobs", f"retry attempt={attempt + 1}/{max_attempts}")
        rc = run_push_ci_server_flow(
            task,
            current_cfg,
            watch=watch,
            session_id_override=session_id_override,
            disable_session_context=disable_session_context,
        )
        if rc == 0:
            _maybe_mark_reja_and_push(task, current_cfg)
            return 0

        failure_result = read_last_result() or {
            "status": "failure",
            "next_action": "fix_required",
            "task": task,
            "errors": ["Bridge flow failed but no structured result file found."],
            "stage": "bridge_client",
        }
        if not maybe_auto_fix_failure(task, current_cfg, failure_result, attempt):
            return rc

    return 1


def summarize_result(result: dict[str, Any]) -> int:
    print("=" * 60)
    print(f"STATUS: {str(result.get('status', 'unknown')).upper()}")
    print(f"TESTS:  {'PASS' if result.get('tests_passed') else 'FAIL'}")
    print(f"TASK:   {result.get('task', '')}")
    print(f"COMMIT: {str(result.get('commit', ''))[:12]}")
    errors = [str(x) for x in result.get("errors", [])]
    warnings = [str(x) for x in result.get("warnings", [])]
    suggestions = [str(x) for x in result.get("suggestions", [])]
    if errors:
        print("ERRORS:")
        for item in errors:
            print(f"- {item}")
    if warnings:
        print("WARNINGS:")
        for item in warnings:
            print(f"- {item}")
    if suggestions:
        print("SUGGESTIONS:")
        for item in suggestions:
            print(f"- {item}")
    print(f"NEXT_ACTION: {result.get('next_action', 'unknown')}")
    print("=" * 60)
    return 0 if result.get("next_action") == "proceed" else 1


def next_reja_task(tasks_file: Path) -> tuple[str, str] | None:
    if not tasks_file.exists():
        raise FileNotFoundError(f"tasks file not found: {tasks_file}")
    for raw_line in tasks_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = REJA_ROW_RE.match(raw_line.strip())
        if not match:
            continue
        status = match.group("status").strip()
        if "?" in status or "Not Started" in status:
            task_no = match.group("task_no").strip()
            title = match.group("title").strip()
            return task_no, title
    return None


def usage() -> int:
    print("Usage:")
    print("  python bridge/bridge_client.py hello")
    print("  python bridge/bridge_client.py push \"task description\" [--watch] [--session-id <id>] [--no-session-context]")
    print("  python bridge/bridge_client.py wait <job_id>")
    print("  python bridge/bridge_client.py events <job_id>")
    print("  python bridge/bridge_client.py watch-events <job_id>")
    print("  python bridge/bridge_client.py next-task")
    print("  python bridge/bridge_client.py bridge-push-next [--watch] [--session-id <id>] [--no-session-context]")
    return 1


def parse_common_push_flags(args: list[str]) -> dict[str, Any]:
    watch = False
    no_session_context = False
    session_id: str | None = None
    i = 0
    while i < len(args):
        token = args[i]
        if token == "--watch":
            watch = True
            i += 1
            continue
        if token == "--no-session-context":
            no_session_context = True
            i += 1
            continue
        if token == "--session-id":
            if i + 1 >= len(args):
                raise ValueError("--session-id value required")
            session_id = args[i + 1].strip()
            i += 2
            continue
        raise ValueError(f"Unknown flag: {token}")
    return {
        "watch": watch,
        "session_id_override": session_id,
        "disable_session_context": no_session_context,
    }


def main() -> int:
    cfg = load_config()
    cfg_path = resolve_config_path()
    client_log(
        "config",
        f"path={cfg_path} server={cfg.server_host}:{cfg.bridge_port} secret_fp={secret_fingerprint(cfg.shared_secret)}",
    )
    if len(sys.argv) < 2:
        return usage()

    cmd = sys.argv[1]
    if cmd == "hello":
        resp = bridge_hello(cfg)
        print(json.dumps(resp, indent=2))
        return 0

    if cmd == "next-task":
        nxt = next_reja_task(cfg.tasks_file)
        if not nxt:
            print("No not-started Phase 2 task found in docReja/Reja.md tracker")
            return 1
        task_no, title = nxt
        print(json.dumps({"task_no": task_no, "title": title}, ensure_ascii=False))
        return 0

    if cmd == "push":
        if len(sys.argv) < 3:
            print("Task description required")
            return 1
        task = sys.argv[2]
        try:
            flags = parse_common_push_flags(sys.argv[3:])
        except ValueError as exc:
            print(str(exc))
            return 1
        return run_task_pipeline_with_retries(task, cfg, **flags)

    if cmd == "wait":
        if len(sys.argv) < 3:
            print("job_id required")
            return 1
        result = wait_for_result(sys.argv[2], cfg)
        if result is None:
            return 1
        print(json.dumps(result, indent=2))
        return 0

    if cmd == "events":
        if len(sys.argv) < 3:
            print("job_id required")
            return 1
        events = get_bridge_events(sys.argv[2], cfg)
        print(json.dumps(events, indent=2))
        return 0

    if cmd == "watch-events":
        if len(sys.argv) < 3:
            print("job_id required")
            return 1
        return watch_bridge_events(sys.argv[2], cfg)

    if cmd == "bridge-push-next":
        nxt = next_reja_task(cfg.tasks_file)
        if not nxt:
            print("No not-started task found")
            return 1
        task_no, title = nxt
        task = f"{task_no} {title}"
        print(f"[bridge-client] next task selected: {task}")
        try:
            flags = parse_common_push_flags(sys.argv[2:])
        except ValueError as exc:
            print(str(exc))
            return 1
        return run_task_pipeline_with_retries(task, cfg, **flags)

    return usage()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        client_log("bridge", "To'xtatildi.")
        raise SystemExit(130)
