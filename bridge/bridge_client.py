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
LAST_TELEGRAM_STATUS = "not_sent"

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
        parsed = {str(k): [str(x) for x in list(v)] for k, v in raw.items() if isinstance(v, list)}
        for key, commands in parsed.items():
            normalized: list[str] = []
            for cmd in commands:
                cmd_s = str(cmd).strip()
                if re.match(r"^bun run typecheck\s+--filter=api(\s|$)", cmd_s, flags=re.IGNORECASE):
                    normalized.append("bun run typecheck")
                else:
                    normalized.append(cmd)
            parsed[key] = normalized
        return parsed

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
    message_l = message.lower()
    channel_color = {
        "config": "36",          # cyan
        "hello": "32",           # green
        "context": "35",         # magenta
        "git": "34",             # blue
        "jobs": "95",            # bright magenta
        "task": "91",            # bright red
        "stage": "31",           # red
        "test": "94",            # bright blue
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
    elif channel_l == "task":
        if "implementation=present" in message_l or "result=success" in message_l:
            channel_color = "92"  # bright green
        elif "implementation=missing" in message_l or "result=fail" in message_l:
            channel_color = "91"  # bright red

    left = ansi_color("38;5;45", "[LAPTOP]")   # turquoise
    right = ansi_color(channel_color or "37", f"[{channel}]")
    print(f"{left}{right} {_redact_sensitive_text(message)}")


def server_log_on_client(channel: str, message: str) -> None:
    channel_l = channel.lower()
    channel_color = {
        "bridge": "38;5;208",  # orange
        "ack": "38;5;208",     # orange
        "codex": "34",         # blue
    }.get(channel_l, "33")
    left = ansi_color("38;5;208", "[SERVER]")
    right = ansi_color(channel_color, f"[{channel}]")
    print(f"{left}{right} {_redact_sensitive_text(message)}")


def _redact_sensitive_text(text: str) -> str:
    if not text:
        return text
    out = text
    out = re.sub(r"(?i)(authorization\s*:\s*bearer\s+)[A-Za-z0-9._\-]+", r"\1<redacted>", out)
    out = re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._\-]{20,}", r"\1<redacted>", out)
    out = re.sub(r"(?i)(\"access_token\"\s*:\s*\")([^\"]+)(\")", r"\1<redacted>\3", out)
    return out


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
        if (
            code == 503
            and isinstance(resp, dict)
            and "bridge-server eshitayapti" in str(resp.get("message", ""))
            and str(resp.get("reply_source", "")).startswith("server_codex_error")
        ):
            # Server bridge is reachable; server-side Codex hello is temporarily unavailable
            # (quota/usage limit/etc). Continue pipeline with a warning.
            return resp
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
            "message": _redact_sensitive_text(message),
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


def _smoke_command_label_fallback(command: str) -> str:
    c = command.lower()
    if "api/health" in c:
        return "API health"
    if "finance/overview" in c:
        return "Moliya overview"
    if "payments/summary" in c:
        return "To'lovlar summary"
    if "/api/schedule" in c or "/schedule?" in c:
        return "Jadval ro'yxati"
    if "/classes/" in c and "/schedule" in c:
        return "Sinf jadvali"
    if "/api/notices" in c:
        if "-x post" in c and "-x patch" in c and "-x delete" in c:
            return "E'lonlar CRUD"
        if "-x post" in c and "\"priority\":\"bad\"" in c:
            return "E'lon invalid priority"
        if "-x post" in c:
            return "E'lon yaratish"
        return "E'lonlar ro'yxati"
    if "/api/assignments" in c:
        if "/submit" in c and "-f " in c:
            return "Topshiriq submit (fayl)"
        if "/stats" in c and "/assignments/" in c:
            return "Topshiriq stats (bitta)"
        if "/stats" in c:
            return "Topshiriq stats"
        if "/assignments/" in c:
            return "Topshiriq get-by-id"
        return "Topshiriqlar ro'yxati"
    if "convertfrom-json" in c and "report" in c:
        return "Hisobot JSON"
    return "Smoke test"


_SMOKE_LABEL_CACHE: dict[str, str] = {}


def _smoke_command_label(command: str, cfg: Config, stage: str) -> str:
    cmd_key = command.strip()
    if not cmd_key:
        return "Smoke test"
    if cmd_key in _SMOKE_LABEL_CACHE:
        return _SMOKE_LABEL_CACHE[cmd_key]

    dyn = cfg.dynamic_smoke
    ai_labels_enabled = bool(dyn.get("ai_labels_enabled", True))
    if not ai_labels_enabled or stage != "post_deploy_smoke":
        label = _smoke_command_label_fallback(command)
        _SMOKE_LABEL_CACHE[cmd_key] = label
        return label

    prompt = (
        "You name a smoke-test command for terminal logs.\n"
        "Return STRICT JSON only: {\"label\":\"...\"}\n"
        "Rules:\n"
        "- Human-readable Uzbek label.\n"
        "- Very short (2-5 words).\n"
        "- Describe test intent from command.\n"
        "- No markdown, no extra text.\n\n"
        f"Stage: {stage}\n"
        f"Command: {command}\n"
    )
    timeout = int(dyn.get("ai_label_timeout_seconds", 12) or 12)
    try:
        res = run_local_codex_prompt(prompt, cfg, timeout_seconds=timeout)
        if res.returncode == 0:
            parsed = parse_json_object_from_text(res.stdout or "")
            if parsed:
                candidate = str(parsed.get("label", "")).strip()
                if candidate:
                    label = candidate[:64]
                    _SMOKE_LABEL_CACHE[cmd_key] = label
                    return label
    except Exception:
        pass

    label = _smoke_command_label_fallback(command)
    _SMOKE_LABEL_CACHE[cmd_key] = label
    return label


def _extract_http_status_code(*texts: str | None) -> int | None:
    for text in texts:
        if not text:
            continue
        # Prefer standalone 3-digit lines (common with curl -w "\n%{http_code}\n")
        m = re.search(r"(?m)^\s*([1-5]\d\d)\s*$", text)
        if m:
            return int(m.group(1))
        # Fallback: use the last standalone 3-digit token
        matches = re.findall(r"(?<!\d)([1-5]\d\d)(?!\d)", text)
        if matches:
            return int(matches[-1])
    return None


def _should_parse_http_status(command: str) -> bool:
    c = (command or "").lower()
    # Only parse for curl-based smoke commands. Avoid false positives from lint/typecheck output.
    return "curl" in c


def _is_expected_negative_http_smoke(command: str) -> bool:
    c = (command or "").lower()
    # Negative smoke commands should state expected error statuses explicitly.
    expected_markers = ("expected 400", "expected 401", "expected 403", "expected 404")
    if any(m in c for m in expected_markers):
        return True
    if ("throw \"expected " in c or "throw 'expected " in c) and ("got $s" in c or "got $status" in c):
        return True
    if " -in @(\"401\",\"403\")" in c or " -in @('401','403')" in c:
        return True
    return False


def _curl_output_excerpt(stdout_text: str | None, stderr_text: str | None, http_code: int | None) -> str | None:
    text = (stdout_text or "").strip()
    if not text:
        text = (stderr_text or "").strip()
    if not text:
        return None
    # Remove trailing curl -w status line if present (we log http=... separately).
    text = re.sub(r"(?ms)\n?HTTP:[1-5]\d\d\s*$", "", text).strip()
    text = re.sub(r"(?ms)\n?[1-5]\d\d\s*$", "", text).strip()
    if not text:
        return None
    if len(text) > 500:
        text = text[:500] + "... [truncated]"
    return text


def _format_smoke_status(rc: int, http_code: int | None = None) -> str:
    # Exit code is always shown in pink for visibility; HTTP status carries success/failure color.
    code = ansi_color("95", f"rc={rc}")
    if http_code is None:
        return code
    http_col = "92" if 200 <= http_code < 400 else ("93" if 400 <= http_code < 500 else "91")
    return f"{code} {ansi_color(http_col, f'http={http_code}')}"


def _build_dynamic_smoke_prompt(task: str, stage: str, cfg: Config) -> str:
    diff_excerpt = _git_diff_excerpt_for_prompt(cfg, max_chars=8000) or "(git diff excerpt unavailable)"
    expected_features = _derive_expected_features_from_subtasks(task, cfg)
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
    expected_block = ""
    if expected_features:
        expected_block = "Expected feature checklist (derived from Reja subtasks):\n- " + "\n- ".join(expected_features) + "\n\n"
    return (
        "You are generating smoke-check shell commands for Talimy bridge automation.\n"
        "Before deciding commands, read and follow project rules from AGENTS.md, docReja/Reja.md, and docReja/Documentation.html.\n"
        "Respect AGENTS.md strict rules (best-practice, minimal-diff, tenant isolation awareness, no shortcuts).\n\n"
        f"Task: {task}\n"
        f"{expected_block}"
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
        if stage != "post_deploy_smoke":
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
        test_name = _smoke_command_label(rendered, cfg, stage)
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
        client_log("test", f"[{stage}] {ansi_color('96', test_name)} start")
        client_log("bridge", f"[{stage}] start cmd={rendered}")
        started = time.time()
        res = run_shell_or_direct(rendered, repo)
        duration = round(time.time() - started, 2)
        http_code = _extract_http_status_code(res.stdout, res.stderr) if _should_parse_http_status(rendered) else None
        effective_rc = res.returncode
        if (
            stage == "post_deploy_smoke"
            and effective_rc == 0
            and http_code is not None
            and http_code >= 400
            and not _is_expected_negative_http_smoke(rendered)
        ):
            effective_rc = 1
            synthetic = f"Bridge smoke guard: unexpected HTTP {http_code} with rc=0 (positive smoke command)"
            res = subprocess.CompletedProcess(
                args=res.args,
                returncode=effective_rc,
                stdout=res.stdout,
                stderr=((res.stderr or "").strip() + ("\n" if (res.stderr or "").strip() else "") + synthetic),
            )
        check_results.append(
            {
                "command": rendered,
                "returncode": effective_rc,
                "http_status": http_code,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "duration_seconds": duration,
            }
        )
        client_log("test", f"[{stage}] {ansi_color('96', test_name)} {_format_smoke_status(effective_rc, http_code)} dur={duration}s")
        if _should_parse_http_status(rendered):
            excerpt = _curl_output_excerpt(res.stdout, res.stderr, http_code)
            if excerpt:
                http_col = "92" if (http_code is not None and 200 <= http_code < 400) else ("93" if (http_code is not None and 400 <= http_code < 500) else "91")
                client_log("test", f"[{stage}] {ansi_color(http_col, 'curl-output')} {excerpt}")
        client_log("bridge", f"[{stage}] done rc={effective_rc} dur={duration}s")
        if stage == "post_deploy_smoke" and event_job_id:
            send_bridge_event(
                cfg,
                job_id=event_job_id,
                event_type="feature_smoke_status",
                task=task,
                commit=event_commit or "",
                workflow=str(smoke_key or "feature-smoke"),
                status="completed",
                conclusion="success" if effective_rc == 0 else "failure",
                message=f"Smoke cmd done rc={effective_rc} dur={duration}s: {rendered[:140]}",
            )
        if effective_rc != 0:
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
                repaired_rendered = command_renderer(repaired_command) if command_renderer else repaired_command
                repaired_test_name = _smoke_command_label(repaired_rendered, cfg, stage)
                client_log("bridge", f"[{stage}] retry repaired cmd={repaired_rendered}")
                started2 = time.time()
                res2 = run_shell_or_direct(repaired_rendered, repo)
                duration2 = round(time.time() - started2, 2)
                http_code2 = _extract_http_status_code(res2.stdout, res2.stderr) if _should_parse_http_status(repaired_rendered) else None
                effective_rc2 = res2.returncode
                if (
                    stage == "post_deploy_smoke"
                    and effective_rc2 == 0
                    and http_code2 is not None
                    and http_code2 >= 400
                    and not _is_expected_negative_http_smoke(repaired_rendered)
                ):
                    effective_rc2 = 1
                    synthetic2 = f"Bridge smoke guard: unexpected HTTP {http_code2} with rc=0 (positive smoke command)"
                    res2 = subprocess.CompletedProcess(
                        args=res2.args,
                        returncode=effective_rc2,
                        stdout=res2.stdout,
                        stderr=((res2.stderr or "").strip() + ("\n" if (res2.stderr or "").strip() else "") + synthetic2),
                    )
                check_results.append(
                    {
                        "command": repaired_rendered,
                        "returncode": effective_rc2,
                        "http_status": http_code2,
                        "stdout": res2.stdout,
                        "stderr": res2.stderr,
                        "duration_seconds": duration2,
                        "repair_retry": True,
                    }
                )
                client_log("test", f"[{stage}] {ansi_color('96', repaired_test_name)}(repaired) {_format_smoke_status(effective_rc2, http_code2)} dur={duration2}s")
                if _should_parse_http_status(repaired_rendered):
                    excerpt2 = _curl_output_excerpt(res2.stdout, res2.stderr, http_code2)
                    if excerpt2:
                        http_col2 = "92" if (http_code2 is not None and 200 <= http_code2 < 400) else ("93" if (http_code2 is not None and 400 <= http_code2 < 500) else "91")
                        client_log("test", f"[{stage}] {ansi_color(http_col2, 'curl-output(repaired)')} {excerpt2}")
                client_log("bridge", f"[{stage}] repaired cmd done rc={effective_rc2} dur={duration2}s")
                if stage == "post_deploy_smoke" and event_job_id:
                    send_bridge_event(
                        cfg,
                        job_id=event_job_id,
                        event_type="feature_smoke_status",
                        task=task,
                        commit=event_commit or "",
                        workflow=str(smoke_key or "feature-smoke"),
                        status="completed",
                        conclusion="success" if effective_rc2 == 0 else "failure",
                        message=f"Smoke repaired cmd done rc={effective_rc2} dur={duration2}s",
                    )
                if effective_rc2 == 0:
                    continue
                stderr_text = (res2.stderr or "").strip()
                stdout_text = (res2.stdout or "").strip()
                rendered = repaired_rendered
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


def _parse_reja_task_subtasks(task: str, cfg: Config) -> list[dict[str, str]]:
    task_no = _extract_task_no(task)
    if not task_no:
        return []
    path = cfg.tasks_file
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8", errors="ignore")
    # Find task section by heading: "### Task X.Y:"
    heading_re = re.compile(rf"^###\s+Task\s+{re.escape(task_no)}\s*:\s*.*$", re.MULTILINE)
    m = heading_re.search(text)
    if not m:
        return []
    start = m.end()
    # Next task/faza heading boundary
    next_heading = re.search(r"^###\s+(Task|FAZA)\s+.*$", text[start:], re.MULTILINE)
    section = text[start : start + (next_heading.start() if next_heading else len(text) - start)]
    rows: list[dict[str, str]] = []
    for line in section.splitlines():
        s = line.strip()
        if not s.startswith("|"):
            continue
        parts = [p.strip() for p in s.strip("|").split("|")]
        if len(parts) < 6:
            continue
        sub_id = parts[0]
        work_item = parts[1]
        acceptance = parts[5]
        if not re.fullmatch(rf"{re.escape(task_no)}\.\d+", sub_id):
            continue
        if sub_id.lower() == "subtask id":
            continue
        rows.append({"id": sub_id, "work_item": work_item, "acceptance": acceptance})
    return rows


def _log_task_checklist(task: str, cfg: Config) -> None:
    subtasks = _parse_reja_task_subtasks(task, cfg)
    if not subtasks:
        client_log("task", "reja_subtasks=not_found")
        return
    client_log("task", f"reja_subtasks=found count={len(subtasks)}")
    for row in subtasks[:8]:
        client_log("task", f"  {ansi_color('91', row['id'])} | {ansi_color('91', row['work_item'])}")
    if len(subtasks) > 8:
        client_log("task", f"  ... +{len(subtasks)-8} more")


def _derive_expected_features_from_subtasks(task: str, cfg: Config) -> list[str]:
    subtasks = _parse_reja_task_subtasks(task, cfg)
    if not subtasks:
        return []
    features: list[str] = []
    for row in subtasks:
        work = row["work_item"].lower()
        if "crud" in work:
            features.extend(["create", "list/findAll", "get/findOne", "update", "delete"])
        if "report" in work or "reports" in work:
            features.append("reports")
        if "statistic" in work:
            features.append("statistics")
        if "dto" in work or "dtos" in work:
            features.append("dto validation")
        if "by class" in work:
            features.append("filter by class")
        if "by teacher" in work:
            features.append("filter by teacher")
        if "by student" in work:
            features.append("filter by student")
        if "day" in work:
            features.append("day filter")
        if "file upload" in work:
            features.append("file upload flow")
        if "real-time" in work or "socket.io" in work:
            features.append("realtime events")
        if "invoice" in work:
            features.append("invoice endpoints")
        if "payment" in work:
            features.append("payments endpoints")
        if "overview" in work or "finance reports" in work:
            features.append("overview/summary endpoints")
    deduped: list[str] = []
    seen: set[str] = set()
    for item in features:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    return deduped[:16]


def _task_verifier_scopes(task: str, cfg: Config) -> list[Path]:
    repo = cfg.laptop_repo_path
    scopes: list[Path] = []
    task_no = _extract_task_no(task) or ""
    slug = _module_task_slug(task)
    if task_no.startswith("2.") and slug:
        scopes.extend(
            [
                repo / "apps" / "api" / "src" / "modules" / slug,
                repo / "packages" / "shared" / "src" / "validators",
                repo / "apps" / "api" / "src" / "app.module.ts",
            ]
        )
    elif task_no.startswith("3.") or task_no.startswith("4.") or task_no.startswith("5.") or task_no.startswith("6.") or task_no.startswith("7.") or task_no.startswith("8.") or task_no.startswith("9.") or task_no.startswith("10.") or task_no.startswith("11.") or task_no.startswith("12."):
        scopes.extend([repo / "apps" / "web", repo / "packages" / "ui", repo / "packages" / "shared"])
    else:
        scopes.append(repo)
    return [p for p in scopes if p.exists()]


def _read_scope_texts(scopes: list[Path], max_files: int = 250) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    exts = {".ts", ".tsx", ".js", ".jsx", ".json", ".md"}
    count = 0
    for scope in scopes:
        if scope.is_file():
            try:
                out.append((str(scope).replace("\\", "/"), scope.read_text(encoding="utf-8", errors="ignore").lower()))
                count += 1
            except Exception:
                pass
            continue
        for p in scope.rglob("*"):
            if count >= max_files:
                return out
            if not p.is_file() or p.suffix.lower() not in exts:
                continue
            try:
                out.append((str(p).replace("\\", "/"), p.read_text(encoding="utf-8", errors="ignore").lower()))
                count += 1
            except Exception:
                continue
    return out


def _verify_one_subtask(work_item: str, files_text: list[tuple[str, str]]) -> tuple[bool, list[str]]:
    w = work_item.lower()
    reasons: list[str] = []
    joined_paths = "\n".join(path for path, _ in files_text)
    joined_text = "\n".join(text[:4000] for _, text in files_text[:60])

    if "crud" in w:
        crud_hits = 0
        for token in ("@post(", "@get(", "@patch(", "@put(", "@delete("):
            if token in joined_text:
                crud_hits += 1
        if crud_hits >= 3:
            reasons.append(f"crud-decorators={crud_hits}")
            return True, reasons
    if "dto" in w:
        if "/dto/" in joined_paths or ".dto.ts" in joined_paths:
            reasons.append("dto-files-found")
            return True, reasons
    for kw in ("report", "reports", "statistics", "summary", "overview"):
        if kw in w and kw in joined_text:
            reasons.append(f"keyword:{kw}")
            return True, reasons
    for kw in ("class", "teacher", "student", "schedule", "finance", "invoice", "payment", "notice", "notification", "calendar", "event", "upload", "assignment", "exam", "grade", "attendance"):
        if kw in w and (kw in joined_paths or kw in joined_text):
            reasons.append(f"domain:{kw}")
            # keep checking for stronger evidence but enough for heuristic
            return True, reasons
    # fallback token heuristic
    tokens = [t for t in re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{3,}", w) if t not in {"create", "update", "delete", "owner", "backend", "lead", "target", "outcome", "verification", "tests", "applicable"}]
    for t in tokens[:5]:
        if t in joined_paths or t in joined_text:
            reasons.append(f"token:{t}")
            return True, reasons
    return False, reasons


def _run_subtask_verifier(task: str, cfg: Config) -> dict[str, Any] | None:
    policy = cfg.task_smoke_policy
    if policy.get("subtask_verifier_enabled") is False:
        client_log("task", "subtask_verifier=skipped (disabled)")
        return None
    subtasks = _parse_reja_task_subtasks(task, cfg)
    if not subtasks:
        client_log("task", "subtask_verifier=skipped (no Reja subtasks found)")
        return None
    scopes = _task_verifier_scopes(task, cfg)
    if not scopes:
        client_log("task", "subtask_verifier=skipped (no scopes)")
        return None
    files_text = _read_scope_texts(scopes)
    rows: list[dict[str, Any]] = []
    present = 0
    for row in subtasks:
        ok, reasons = _verify_one_subtask(row["work_item"], files_text)
        rows.append({"id": row["id"], "work_item": row["work_item"], "present": ok, "reasons": reasons})
        mark_color = "92" if ok else "91"
        state_text = "present" if ok else "missing"
        client_log(
            "task",
            f"{ansi_color(mark_color, row['id'])} {ansi_color(mark_color, state_text)} | {ansi_color(mark_color, row['work_item'])}",
        )
        if ok:
            present += 1
    missing = len(rows) - present
    total = max(1, len(rows))
    ratio = present / total
    min_present = int(policy.get("subtask_verifier_min_present", 1))
    try:
        min_ratio = float(policy.get("subtask_verifier_min_ratio", 0.34))
    except Exception:
        min_ratio = 0.34
    min_ratio = max(0.0, min(1.0, min_ratio))
    client_log(
        "task",
        f"subtask_verifier summary present={present}/{len(rows)} ratio={ratio:.0%} threshold>={min_present} and {min_ratio:.0%}",
    )
    if present < min_present or ratio < min_ratio:
        result = {
            "status": "failure",
            "tests_passed": False,
            "errors": [
                f"Task subtasks uchun local evidence threshold o'tmadi: present={present}/{len(rows)} ({ratio:.0%}), talab >= {min_present} va >= {min_ratio:.0%}.",
            ],
            "warnings": [],
            "suggestions": ["Avval task subtasklarini implement qiling yoki featurega mos kod fayllarini qo'shing."],
            "next_action": "fix_required",
            "task": task,
            "commit": "",
            "stage": "subtask_verifier",
            "subtask_verifier": {
                "present": present,
                "missing": missing,
                "total": len(rows),
                "ratio": ratio,
                "min_present": min_present,
                "min_ratio": min_ratio,
                "rows": rows,
            },
        }
        write_last_result(result)
        return result
    return {
        "status": "success",
        "tests_passed": True,
        "errors": [],
        "warnings": [],
        "suggestions": [],
        "next_action": "proceed",
        "task": task,
        "commit": "",
        "stage": "subtask_verifier",
        "subtask_verifier": {
            "present": present,
            "missing": missing,
            "total": len(rows),
            "ratio": ratio,
            "min_present": min_present,
            "min_ratio": min_ratio,
            "rows": rows,
        },
    }


def _task_title_without_number(task: str) -> str:
    m = TASK_NUMBER_RE.search(task)
    if not m:
        return task.strip()
    tail = task[m.end() :].strip(" :-\t")
    return tail or task.strip()


def _module_task_slug(task: str) -> str | None:
    m = re.search(r"([A-Za-z][A-Za-z0-9_-]*)\s+Module\b", _task_title_without_number(task), re.IGNORECASE)
    if not m:
        return None
    return m.group(1).lower()


def _check_task_implementation_presence(task: str, cfg: Config) -> dict[str, Any] | None:
    task_no = _extract_task_no(task)
    slug = _module_task_slug(task)
    if not task_no or not slug or not task_no.startswith("2."):
        return None

    repo = cfg.laptop_repo_path
    module_dir = repo / "apps" / "api" / "src" / "modules" / slug
    expected_files = [
        module_dir / f"{slug}.module.ts",
        module_dir / f"{slug}.controller.ts",
        module_dir / f"{slug}.service.ts",
    ]
    existing = [p for p in expected_files if p.exists()]
    if module_dir.exists() and existing:
        def _read(p: Path) -> str:
            try:
                return p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                return ""

        def _has_real_service_logic(text: str) -> bool:
            if "@Injectable" not in text:
                return False
            # At least one method beyond constructor suggests non-empty implementation.
            return bool(re.search(r"(?m)^\s*(?:async\s+)?[a-zA-Z_]\w*\s*\(", text))

        signals: list[str] = []
        missing_signals: list[str] = []
        if len(existing) == len(expected_files):
            module_text = _read(expected_files[0])
            controller_text = _read(expected_files[1])
            service_text = _read(expected_files[2])

            module_ok = ("@Module" in module_text) and ("controllers" in module_text or "providers" in module_text)
            controller_ok = ("@Controller" in controller_text) and bool(
                re.search(r"@\s*(Get|Post|Patch|Put|Delete)\s*\(", controller_text)
            )
            service_ok = _has_real_service_logic(service_text)

            for name, ok in [("module", module_ok), ("controller", controller_ok), ("service", service_ok)]:
                (signals if ok else missing_signals).append(name)

            if module_ok and controller_ok and service_ok:
                client_log(
                    "task",
                    f"implementation=present task={task_no} module={slug} files={len(existing)}/{len(expected_files)} signals=module+controller+service",
                )
                return None

        client_log(
            "task",
            f"implementation=missing task={task_no} module={slug} files={len(existing)}/{len(expected_files)} missing_signals={','.join(missing_signals) or 'files'}",
        )
        result = {
            "status": "failure",
            "tests_passed": False,
            "errors": [
                f"Task {task_no} uchun lokal modul skeleti topildi, lekin implementatsiya signallari yetarli emas: module={slug}.",
            ],
            "warnings": [
                f"Mavjud fayllar: {len(existing)}/{len(expected_files)}",
                *([f"Yetishmayotgan signallar: {', '.join(missing_signals)}"] if missing_signals else []),
            ],
            "suggestions": [
                f"{slug} modulida kamida @Module wiring, controller route decorators va service metodlarini implement qiling.",
            ],
            "next_action": "fix_required",
            "task": task,
            "commit": "",
            "stage": "implementation_presence",
        }
        write_last_result(result)
        return result

    client_log("task", f"implementation=missing task={task_no} module={slug}")
    result = {
        "status": "failure",
        "tests_passed": False,
        "errors": [f"Task {task_no} uchun lokal modul topilmadi: apps/api/src/modules/{slug}/"],
        "warnings": [],
        "suggestions": [
            f"Avval {slug} modulini implement qiling (module/controller/service + DTO/validators), keyin push qiling.",
        ],
        "next_action": "fix_required",
        "task": task,
        "commit": "",
        "stage": "implementation_presence",
    }
    write_last_result(result)
    return result


def _run_task_implementation_verifier(task: str, cfg: Config) -> dict[str, Any] | None:
    subtasks = _parse_reja_task_subtasks(task, cfg)
    checklist_lines = [f"- {row['id']}: {row['work_item']}" for row in subtasks[:20]]
    if len(subtasks) > 20:
        checklist_lines.append(f"- ... +{len(subtasks)-20} more")
    checklist_block = "\n".join(checklist_lines) if checklist_lines else "- (Reja subtask topilmadi)"
    scopes = _task_verifier_scopes(task, cfg)
    scope_block = "\n".join(f"- {str(p.relative_to(cfg.laptop_repo_path))}" if str(p).startswith(str(cfg.laptop_repo_path)) else f"- {p}" for p in scopes[:20]) if scopes else "- (scope auto-topilmadi)"
    timeout = int(cfg.auto_fix.get("codex_timeout_seconds", 900) or 900)
    prompt = (
        "Talimy task implementation verifier (analysis only, NO edits).\n"
        "AGENTS.md, docReja/Reja.md, docReja/Documentation.html qoidalarini hisobga ol.\n"
        "Kod yozma, fayl o'zgartirma, commit qilma.\n"
        "Repo ichida qidirib task va subtasks bo'yicha implementation holatini bahola.\n\n"
        f"Task: {task}\n\n"
        "Reja subtasks:\n"
        f"{checklist_block}\n\n"
        "Priority search scopes (hints only):\n"
        f"{scope_block}\n\n"
        "Baholash qoidasi:\n"
        "- `present`: task/subtask uchun aniq kod dalili bor (route/service/dto/schema/wiring/test/smoke-level signal).\n"
        "- `partial`: skelet yoki qisman dalil bor, lekin acceptance to'liq emas.\n"
        "- `missing`: amaliy dalil topilmadi.\n"
        "Har subtask uchun qisqa reason yoz.\n\n"
        "FAQAT JSON qaytar:\n"
        "{\n"
        '  "status": "success" | "failure",\n'
        '  "tests_passed": true | false,\n'
        '  "implemented_level": "present" | "partial" | "missing",\n'
        '  "errors": ["..."],\n'
        '  "warnings": ["..."],\n'
        '  "suggestions": ["..."],\n'
        '  "next_action": "proceed" | "fix_required",\n'
        '  "subtasks": [{"id":"2.x.y","status":"present|partial|missing","reason":"..."}]\n'
        "}\n"
    )
    client_log("task", "implementation_verifier (codex) start")
    try:
        res = run_local_codex_prompt(prompt, cfg, timeout_seconds=timeout)
    except FileNotFoundError:
        client_log("task", "implementation_verifier fallback (local codex CLI topilmadi)")
        return _check_task_implementation_presence(task, cfg)
    if res.returncode != 0:
        err = (res.stderr or res.stdout or "").strip()
        client_log("task", f"implementation_verifier fallback (codex rc={res.returncode})")
        if err:
            client_log("bridge", f"implementation_verifier codex error: {err[:240]}")
        return _check_task_implementation_presence(task, cfg)

    parsed = parse_json_object_from_text(res.stdout or "")
    if not parsed:
        client_log("task", "implementation_verifier fallback (invalid JSON)")
        return _check_task_implementation_presence(task, cfg)

    sub_rows = parsed.get("subtasks", [])
    if isinstance(sub_rows, list):
        for row in sub_rows[:30]:
            if not isinstance(row, dict):
                continue
            sid = str(row.get("id", "")).strip() or "subtask"
            st = str(row.get("status", "")).strip().lower() or "unknown"
            reason = str(row.get("reason", "")).strip()
            color = "92" if st == "present" else ("93" if st == "partial" else "91")
            client_log("task", f"{ansi_color(color, sid)} {ansi_color(color, st)}{(' | ' + ansi_color(color, reason)) if reason else ''}")

    impl_level = str(parsed.get("implemented_level", "")).strip().lower()
    next_action = str(parsed.get("next_action", "")).strip()
    if next_action not in {"proceed", "fix_required"}:
        next_action = "proceed" if impl_level == "present" else "fix_required"
    # Enforce bridge-wide invariant: next_action is the source of truth for final pass/fail state.
    status = "success" if next_action == "proceed" else "failure"
    tests_passed = next_action == "proceed"
    warnings = [str(x) for x in parsed.get("warnings", [])] if isinstance(parsed.get("warnings"), list) else []
    errors = [str(x) for x in parsed.get("errors", [])] if isinstance(parsed.get("errors"), list) else []
    suggestions = [str(x) for x in parsed.get("suggestions", [])] if isinstance(parsed.get("suggestions"), list) else []

    client_log(
        "task",
        f"implementation_verifier result level={impl_level or 'unknown'} next={next_action}",
    )
    result = {
        "status": status,
        "tests_passed": tests_passed,
        "errors": errors,
        "warnings": warnings,
        "suggestions": suggestions,
        "next_action": next_action,
        "task": task,
        "commit": "",
        "stage": "implementation_verifier",
        "implementation_verifier": {
            "implemented_level": impl_level or ("present" if next_action == "proceed" else "partial"),
            "subtasks": sub_rows if isinstance(sub_rows, list) else [],
        },
    }
    if next_action != "proceed":
        write_last_result(result)
        return result
    return None


def _standardize_reja_evidence(task: str, cfg: Config, result: dict[str, Any] | None) -> str:
    if not isinstance(result, dict):
        return "-"
    parts: list[str] = []
    commit = str(result.get("commit", "")).strip()
    repo = cfg.laptop_repo_path
    if commit:
        try:
            files = [p.replace("\\", "/") for p in changed_files_for_commit(repo, commit)]
        except Exception:
            files = []
        # Prefer feature-code files over bridge/docs noise for evidence.
        code_files = [
            p for p in files
            if not (p.startswith("bridge/") or p.startswith("docReja/"))
        ]
        chosen = code_files or files
        if chosen:
            preview = ", ".join(f"`{p}`" for p in chosen[:8])
            if len(chosen) > 8:
                preview += ", ..."
            parts.append(preview)
    ci = result.get("github_ci")
    if isinstance(ci, dict):
        runs = ci.get("runs")
        if isinstance(runs, list) and runs:
            ok = 0
            total = 0
            for r in runs:
                if not isinstance(r, dict):
                    continue
                total += 1
                if str(r.get("conclusion", "")).lower() == "success":
                    ok += 1
            if total:
                parts.append(f"CI {ok}/{total} success")
        elif bool(ci.get("skipped_no_runs")):
            parts.append("CI skipped (no matching workflow)")
    checks = result.get("checks")
    if isinstance(checks, list) and checks:
        total = 0
        ok = 0
        for chk in checks:
            if not isinstance(chk, dict):
                continue
            total += 1
            if int(chk.get("returncode", 1)) == 0:
                ok += 1
        if total:
            parts.append(f"runtime checks {ok}/{total} pass")
    feature_smoke = result.get("feature_smoke")
    if isinstance(feature_smoke, dict):
        check_set = str(feature_smoke.get("check_set", "")).strip()
        smoke_status = str(feature_smoke.get("status", "")).strip().lower()
        if check_set or smoke_status:
            if smoke_status:
                parts.append(f"feature smoke {check_set or 'set'} {smoke_status}")
            else:
                parts.append(f"feature smoke {check_set}")
    if not parts:
        return "-"
    return "; ".join(parts)


def mark_reja_task_completed(task: str, cfg: Config, result: dict[str, Any] | None = None) -> bool:
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
    evidence = _standardize_reja_evidence(task, cfg, result)
    row_re = re.compile(
        rf"^(\|\s*{re.escape(task_no)}\s*\|\s*[^|]+\|\s*)([^|]+?)(\s*\|\s*)([^|]+?)(\s*\|\s*)([^|]*?)(\s*\|.*)$"
    )
    for line in lines:
        m = row_re.match(line)
        if not m:
            out_lines.append(line)
            continue
        new_line = (
            f"{m.group(1)}\U0001F7E2 Completed"
            f"{m.group(3)}{target_date}"
            f"{m.group(5)}{evidence}"
            f"{m.group(7)}"
        )
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
        ["codex", "-s", "danger-full-access", "-a", "never", "exec", "--color", "never", prompt],
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


def _git_status_paths(cfg: Config) -> list[str]:
    entries = _git_status_short(cfg)
    paths: list[str] = []
    for line in entries:
        # porcelain short format: XY <path> or XY <old> -> <new>
        body = line[3:] if len(line) >= 4 else line
        body = body.strip()
        if not body:
            continue
        if " -> " in body:
            body = body.split(" -> ", 1)[1].strip()
        paths.append(body.replace("\\", "/"))
    return paths


def _task_autofix_allowed_paths(task: str, stage: str) -> list[str]:
    task_no = _extract_task_no(task) or ""
    slug = _module_task_slug(task)
    allowed: list[str] = []
    if task_no.startswith("2.") and slug:
        allowed.extend(
            [
                f"apps/api/src/modules/{slug}/",
                f"packages/shared/src/validators/{slug}.schema.ts",
                # common singularized validator names (assignments->assignment, notices->notice, notifications->notification)
                f"packages/shared/src/validators/{slug.rstrip('s')}.schema.ts",
                "packages/shared/src/validators/index.ts",
                "apps/api/src/app.module.ts",
            ]
        )
    if stage in {"implementation_verifier", "local_smoke"}:
        # No docs/bridge edits should be auto-committed while implementing task code.
        return [p for p in allowed if p]
    # For bridge-stage failures, allow bridge files too.
    if stage.startswith("bridge") or "smoke" in stage:
        allowed.extend(["bridge/", "docReja/Reja.md"])
    return [p for p in allowed if p]


def _paths_outside_allowlist(paths: list[str], allowlist: list[str]) -> list[str]:
    if not allowlist:
        return []
    outside: list[str] = []
    for path in paths:
        norm = path.replace("\\", "/")
        # Ignore known local-noise files so task auto-fix is not blocked by tooling artifacts
        # or bridge-orchestrator local edits.
        if (
            norm == "Untitled"
            or norm.endswith(".tsbuildinfo")
            or norm.startswith("bridge/")
        ):
            continue
        ok = False
        for allow in allowlist:
            a = allow.replace("\\", "/")
            if a.endswith("/"):
                if norm.startswith(a):
                    ok = True
                    break
            elif norm == a:
                ok = True
                break
        if not ok:
            outside.append(norm)
    return outside


def _auto_fix_target_hints(task: str, stage: str, failure_result: dict[str, Any]) -> list[str]:
    texts: list[str] = [task, stage]
    for key in ("errors", "warnings", "suggestions"):
        vals = failure_result.get(key, [])
        if isinstance(vals, list):
            texts.extend(str(x) for x in vals[:8])
    blob = "\n".join(texts).lower()
    hints: list[str] = []

    task_no = _extract_task_no(task)
    if task_no:
        if task_no.startswith("2.11"):
            hints.extend([
                "apps/api/src/modules/grades/**",
                "packages/shared/src/validators/grade.schema.ts",
            ])
        elif task_no.startswith("2.12"):
            hints.extend([
                "apps/api/src/modules/exams/**",
                "packages/shared/src/validators/exam.schema.ts",
            ])
        elif task_no.startswith("2.14"):
            hints.extend([
                "apps/api/src/modules/schedule/**",
                "apps/api/src/modules/classes/**",
                "packages/shared/src/validators/**schedule*.ts",
            ])
        elif task_no.startswith("2."):
            hints.extend([
                "apps/api/src/modules/**",
                "packages/shared/src/validators/**",
            ])

    if "/api/classes/" in blob and "/schedule" in blob:
        hints.extend([
            "apps/api/src/modules/classes/classes.controller.ts",
            "apps/api/src/modules/classes/dto/**",
            "apps/api/src/modules/schedule/**",
        ])
    if "/api/schedule" in blob or "/api/schedules" in blob:
        hints.extend([
            "apps/api/src/modules/schedule/**",
            "apps/api/src/modules/schedule/dto/**",
            "packages/shared/src/validators/**schedule*.ts",
        ])
    if "validation failed" in blob:
        hints.extend([
            "apps/api/src/common/**",
            "apps/api/src/modules/**/dto/**",
            "packages/shared/src/validators/**",
        ])

    deduped: list[str] = []
    seen: set[str] = set()
    for hint in hints:
        if hint not in seen:
            seen.add(hint)
            deduped.append(hint)
    return deduped[:12]


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
    target_hints = _auto_fix_target_hints(task, stage, failure_result)
    reja_subtasks = _parse_reja_task_subtasks(task, cfg)
    target_block = ""
    if target_hints:
        target_block = (
            "Source-file targeting hints (search these first; do not hardcode assumptions):\n- "
            + "\n- ".join(target_hints)
            + "\n\n"
        )
    reja_block = ""
    if reja_subtasks:
        checklist_lines = []
        for row in reja_subtasks[:10]:
            checklist_lines.append(f"- {row['id']}: {row['work_item']} | Acceptance: {row['acceptance']}")
        if len(reja_subtasks) > 10:
            checklist_lines.append(f"- ... +{len(reja_subtasks)-10} more subtasks")
        reja_block = "Reja task subtasks (expected outcomes/checklist):\n" + "\n".join(checklist_lines) + "\n\n"

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
        f"{reja_block}"
        f"{target_block}"
        "Qilish kerak:\n"
        "1. Xatoni tuzat (minimal-diff, best-practice)\n"
        "2. Lokal smoke/lint/typecheck zarur bo'lsa ishlat\n"
        "3. Kerakli o'zgarishlarni commit qil (inglizcha commit message)\n"
        "4. Push QILMA (bridge client push qiladi)\n"
        "5. FAQAT qisqa yakun yoz: nima tuzatding\n"
    )
    client_log("bridge", f"auto-fix start attempt={attempt + 1}/{max_retries} stage={stage}")
    head_before = current_commit(cfg.laptop_repo_path)
    before_status = _git_status_short(cfg)
    before_paths = _git_status_paths(cfg)
    allowlist = _task_autofix_allowed_paths(task, stage)
    if allowlist:
        client_log("bridge", f"auto-fix scope={', '.join(allowlist[:6])}{' ...' if len(allowlist) > 6 else ''}")
    outside_before = _paths_outside_allowlist(before_paths, allowlist) if before_paths and allowlist else []
    if before_status:
        client_log("bridge", f"auto-fix pre-status entries={len(before_status)}")
    else:
        client_log("bridge", "auto-fix pre-status clean")
    if outside_before:
        preview = ", ".join(outside_before[:8])
        if len(outside_before) > 8:
            preview += ", ..."
        client_log("bridge", f"auto-fix blocked: unrelated dirty files present [{preview}]")
        return False
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
    after_paths = _git_status_paths(cfg)
    changed_files = _git_changed_files(cfg)
    diff_stat = _git_diff_stat(cfg)
    head_after = current_commit(cfg.laptop_repo_path)
    committed_files: list[str] = []
    if head_after != head_before:
        committed_files = [p.replace("\\", "/") for p in changed_files_for_commit(cfg.laptop_repo_path, head_after)]
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
    if head_after != head_before:
        mode = "edit+commit"
        client_log("bridge", f"auto-fix mode={mode} commit={head_after[:8]}")
        if committed_files:
            preview = ", ".join(committed_files[:8])
            if len(committed_files) > 8:
                preview += ", ..."
            client_log("bridge", f"auto-fix committed_files={len(committed_files)} [{preview}]")
            outside_commit = _paths_outside_allowlist(committed_files, allowlist) if allowlist else []
            if outside_commit:
                p = ", ".join(outside_commit[:8])
                if len(outside_commit) > 8:
                    p += ", ..."
                client_log("bridge", f"auto-fix warning: commit scope outside task [{p}]")
    else:
        mode = "analysis-only" if not changed_files and not after_status else "edit-no-commit"
        client_log("bridge", f"auto-fix mode={mode}")
    outside_after = _paths_outside_allowlist(after_paths, allowlist) if after_paths and allowlist else []
    if outside_after:
        preview = ", ".join(outside_after[:8])
        if len(outside_after) > 8:
            preview += ", ..."
        client_log("bridge", f"auto-fix blocked: unrelated dirty files after run [{preview}]")
        return False
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


def _json_request(
    method: str,
    url: str,
    payload: dict[str, Any] | None,
    timeout: int,
    *,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any]]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        if v:
            req.add_header(str(k), str(v))
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body) if body else {}
            except json.JSONDecodeError:
                parsed = {"raw": body}
            return int(getattr(resp, "status", 200) or 200), parsed
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return int(exc.code), parsed
    except error.URLError as exc:
        return 599, {"error": str(exc)}


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
    global LAST_TELEGRAM_STATUS
    tg = cfg.telegram
    if not bool(tg.get("enabled", False)):
        LAST_TELEGRAM_STATUS = "skipped_disabled"
        client_log("telegram", "skip (disabled)")
        return

    bot_token = str(tg.get("bot_token", "")).strip()
    chat_id = str(tg.get("chat_id", "")).strip()
    if not bot_token or not chat_id:
        LAST_TELEGRAM_STATUS = "skipped_missing_config"
        client_log("telegram", "skip (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)")
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
        LAST_TELEGRAM_STATUS = f"sent_{status.lower()}"
        client_log("telegram", f"sent ({status})")
    except Exception as exc:
        LAST_TELEGRAM_STATUS = "send_failed"
        client_log("telegram", f"send failed: {exc}")
        return


def _telegram_enabled_config(cfg: Config) -> tuple[bool, str, str]:
    tg = cfg.telegram
    enabled = bool(tg.get("enabled", False))
    bot_token = str(tg.get("bot_token", "")).strip()
    chat_id = str(tg.get("chat_id", "")).strip()
    return enabled, bot_token, chat_id


def _telegram_get_updates(bot_token: str, *, offset: int | None, timeout_s: int, request_timeout: int) -> dict[str, Any]:
    params = [f"timeout={max(0, timeout_s)}"]
    if offset is not None:
        params.append(f"offset={offset}")
    url = f"https://api.telegram.org/bot{bot_token}/getUpdates?{'&'.join(params)}"
    req = request.Request(url, method="GET")
    with request.urlopen(req, timeout=request_timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return json.loads(body) if body else {"ok": False, "result": []}


def prompt_continue_next_task(cfg: Config, *, task: str = "") -> bool:
    enabled, bot_token, chat_id = _telegram_enabled_config(cfg)
    if enabled and bot_token and chat_id:
        try:
            # Baseline offset so old updates are ignored.
            baseline = _telegram_get_updates(bot_token, offset=None, timeout_s=0, request_timeout=cfg.request_timeout_seconds)
            offset: int | None = None
            if bool(baseline.get("ok")) and isinstance(baseline.get("result"), list):
                ids = [int(x.get("update_id")) for x in baseline["result"] if isinstance(x, dict) and str(x.get("update_id", "")).isdigit()]
                if ids:
                    offset = max(ids) + 1

            nonce = uuid.uuid4().hex[:12]
            yes_data = f"bridge_next_yes:{nonce}"
            no_data = f"bridge_next_no:{nonce}"
            title = "Keyingi taskga o'taymi?"
            if task:
                title = f"Task tugadi: {task}\nKeyingi taskga o'taymi?"
            payload = {
                "chat_id": chat_id,
                "text": title,
                "reply_markup": {
                    "inline_keyboard": [[
                        {"text": "Ha bajar", "callback_data": yes_data},
                        {"text": "Yo'q meni kut", "callback_data": no_data},
                    ]]
                },
            }
            code, resp = http_json(
                "POST",
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                payload,
                cfg.request_timeout_seconds,
                token="",
            )
            if code >= 400 or not bool(resp.get("ok", True)):
                raise RuntimeError(f"sendMessage failed ({code}): {resp}")
            msg_obj = resp.get("result", {}) if isinstance(resp, dict) else {}
            message_id = int(msg_obj.get("message_id", 0)) if str(msg_obj.get("message_id", "")).isdigit() else 0
            client_log("telegram", "awaiting button response (Ha bajar / Yo'q meni kut)")

            poll_total = int(cfg.telegram.get("next_task_prompt_timeout_seconds", 900) or 900)
            started = time.time()
            while time.time() - started < poll_total:
                left = int(poll_total - (time.time() - started))
                batch_timeout = min(25, max(1, left))
                updates = _telegram_get_updates(
                    bot_token,
                    offset=offset,
                    timeout_s=batch_timeout,
                    request_timeout=max(cfg.request_timeout_seconds, batch_timeout + 5),
                )
                if not bool(updates.get("ok")):
                    continue
                for upd in updates.get("result", []) or []:
                    if not isinstance(upd, dict):
                        continue
                    uid = upd.get("update_id")
                    if isinstance(uid, int):
                        offset = uid + 1
                    cq = upd.get("callback_query")
                    if not isinstance(cq, dict):
                        continue
                    data = str(cq.get("data", ""))
                    msg = cq.get("message") if isinstance(cq.get("message"), dict) else {}
                    cq_chat_id = str(((msg or {}).get("chat", {}) or {}).get("id", ""))
                    cq_msg_id = int(msg.get("message_id", 0)) if str(msg.get("message_id", "")).isdigit() else 0
                    if cq_chat_id != chat_id:
                        continue
                    if message_id and cq_msg_id and cq_msg_id != message_id:
                        continue
                    if data not in {yes_data, no_data}:
                        continue
                    cq_id = str(cq.get("id", "")).strip()
                    if cq_id:
                        try:
                            http_json(
                                "POST",
                                f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery",
                                {"callback_query_id": cq_id, "text": "Qabul qilindi"},
                                cfg.request_timeout_seconds,
                                token="",
                            )
                        except Exception:
                            pass
                    try:
                        http_json(
                            "POST",
                            f"https://api.telegram.org/bot{bot_token}/editMessageReplyMarkup",
                            {"chat_id": chat_id, "message_id": cq_msg_id or message_id, "reply_markup": {"inline_keyboard": []}},
                            cfg.request_timeout_seconds,
                            token="",
                        )
                    except Exception:
                        pass
                    if data == yes_data:
                        client_log("prompt", "Telegram javobi: Ha bajar")
                        return True
                    client_log("prompt", "Telegram javobi: Yo'q meni kut")
                    return False

            client_log("telegram", "next-task prompt timeout; terminal prompt fallback")
        except Exception as exc:
            client_log("telegram", f"next-task prompt failed; terminal fallback: {exc}")

    while True:
        try:
            answer = input("\n[LAPTOP][prompt] Keyingi taskga o'taymi? (y/n): ").strip().lower()
        except EOFError:
            return False
        if answer in {"y", "yes", "ha", "h"}:
            return True
        if answer in {"n", "no", "yoq", "yo'q", "q", "quit", ""}:
            return False
        client_log("prompt", "Noto'g'ri javob. 'y' yoki 'n' kiriting.")


def run_push_ci_server_flow(
    task: str,
    cfg: Config,
    *,
    watch: bool = False,
    session_id_override: str | None = None,
    disable_session_context: bool = False,
) -> int:
    client_log("task", f"pipeline start: {ansi_color('91', task)}")
    _log_task_checklist(task, cfg)
    impl_presence = _run_task_implementation_verifier(task, cfg)
    if impl_presence is not None:
        send_telegram_notification(impl_presence, cfg)
        return summarize_result(impl_presence)
    subtask_verify = _run_subtask_verifier(task, cfg)
    if subtask_verify is not None and str(subtask_verify.get("next_action", "proceed")) != "proceed":
        send_telegram_notification(subtask_verify, cfg)
        return summarize_result(subtask_verify)

    client_log("stage", "local_smoke")
    smoke_result = run_local_task_smoke(task, cfg)
    if smoke_result is not None and smoke_result.get("next_action") != "proceed":
        send_telegram_notification(smoke_result, cfg)
        return summarize_result(smoke_result)

    client_log("stage", "bridge_hello")
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
    if hello_src == "server_codex_error":
        client_log("hello", "server codex hello unavailable; bridge server reachable, davom etiladi")
    session_context = build_session_context_excerpt(
        cfg,
        session_id_override=session_id_override,
        disable_session_context=disable_session_context,
    )
    if session_context and session_context.get("excerpt"):
        client_log("context", f"session context loaded ({session_context.get('message_count', 0)} messages)")
    client_log("stage", "git_push")
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

    client_log("stage", "github_ci")
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
    client_log("stage", "dokploy_deploy")
    dokploy_result = trigger_dokploy_deploy(task, commit, cfg, deploy_job_id)
    if dokploy_result is not None and dokploy_result.get("status") == "failure":
        write_last_result(dokploy_result)
        send_telegram_notification(dokploy_result, cfg)
        return summarize_result(dokploy_result)

    client_log("stage", "runtime_health")
    runtime_result = run_runtime_health_checks(task, commit, cfg, deploy_job_id)
    if runtime_result is not None and runtime_result.get("status") == "failure":
        write_last_result(runtime_result)
        send_telegram_notification(runtime_result, cfg)
        return summarize_result(runtime_result)

    # Run feature smoke after deploy/runtime health, before server runtime/Codex review,
    # so server review sees a more final event timeline.
    feature_job_id = f"feature-{uuid.uuid4().hex}"
    client_log("stage", "post_deploy_smoke")
    feature_smoke_result = run_post_deploy_feature_smoke(task, commit, cfg, feature_job_id)
    if feature_smoke_result is not None:
        if ci_result is not None:
            feature_smoke_result["github_ci"] = ci_result.get("github_ci", {})
        if feature_smoke_result.get("next_action") != "proceed":
            send_telegram_notification(feature_smoke_result, cfg)
            return summarize_result(feature_smoke_result)

    client_log("stage", "server_runtime_review")
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
    if feature_smoke_result is not None:
        result["feature_smoke"] = feature_smoke_result.get("post_deploy_smoke", {})
        for key in ("warnings", "suggestions"):
            merged = [str(x) for x in result.get(key, [])]
            for item in feature_smoke_result.get(key, []):
                s = str(item)
                if s not in merged:
                    merged.append(s)
            result[key] = merged
    write_last_result(result)
    send_telegram_notification(result, cfg)
    return summarize_result(result)


def _maybe_mark_reja_and_push(task: str, cfg: Config, result: dict[str, Any] | None = None) -> None:
    if not mark_reja_task_completed(task, cfg, result):
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
            client_log("task", "pipeline result=SUCCESS")
            success_result = read_last_result()
            _maybe_mark_reja_and_push(task, current_cfg, success_result)
            return 0

        failure_result = read_last_result() or {
            "status": "failure",
            "next_action": "fix_required",
            "task": task,
            "errors": ["Bridge flow failed but no structured result file found."],
            "stage": "bridge_client",
        }
        client_log(
            "task",
            f"pipeline result=FAIL stage={failure_result.get('stage','unknown')} next={failure_result.get('next_action','')}",
        )
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
        try:
            flags = parse_common_push_flags(sys.argv[2:])
        except ValueError as exc:
            print(str(exc))
            return 1
        while True:
            current_cfg = load_config()
            nxt = next_reja_task(current_cfg.tasks_file)
            if not nxt:
                print("No not-started task found")
                return 0
            task_no, title = nxt
            task = f"{task_no} {title}"
            print(f"[bridge-client] next task selected: {task}")
            rc = run_task_pipeline_with_retries(task, current_cfg, **flags)
            if rc != 0:
                return rc
            client_log("bridge", f"Task success. Telegram status: {LAST_TELEGRAM_STATUS}")
            if not prompt_continue_next_task(current_cfg, task=task):
                client_log("bridge", "Foydalanuvchi javobi bo'yicha to'xtatildi.")
                return 0

    return usage()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        client_log("bridge", "To'xtatildi.")
        raise SystemExit(130)
