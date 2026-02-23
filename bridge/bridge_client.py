#!/usr/bin/env python3
"""Talimy Bridge Client

Laptop-side bridge client that pushes to GitHub, notifies bridge server, waits for result,
and optionally helps pick the next task from docReja/Reja.md tracker table.
"""

from __future__ import annotations

import json
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
CONFIG_PATH = BASE_DIR / "bridge_config.json"
LAST_RESULT_PATH = BASE_DIR / ".bridge-state" / "last_bridge_result.json"

REJA_ROW_RE = re.compile(
    r"^\|\s*(?P<task_no>2\.\d+)\s*\|\s*(?P<title>[^|]+?)\s*\|\s*(?P<status>[^|]+?)\s*\|",
    re.UNICODE,
)


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


def load_config() -> Config:
    return Config(raw=json.loads(CONFIG_PATH.read_text(encoding="utf-8")))


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
    return subprocess.run(command, cwd=str(cwd), capture_output=True, text=True)


def run_cmd(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=None if cwd is None else str(cwd), capture_output=True, text=True)


def current_commit(cwd: Path) -> str:
    res = run_git(["git", "rev-parse", "HEAD"], cwd)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or "git rev-parse failed")
    return res.stdout.strip()


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
        print(f"[bridge-server] {resp['ack']}")
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
            print(f"[bridge-server] {ack}")
        return resp
    print(f"[bridge-client] bridge event failed ({code}): {resp}")
    return None


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


def build_session_context_excerpt(cfg: Config) -> dict[str, Any] | None:
    sc = cfg.session_context
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
    watch_workflows = {str(x).strip() for x in ci_cfg.get("workflows", []) if str(x).strip()}

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
        res = run_cmd(cmd, repo)
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
        "github_ci": {"repo": repo_slug, "runs": last_runs},
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
            write_last_result(resp)
            print("\n[bridge-client] result received")
            return resp
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
            print(f"\n[bridge-client] {prefix}watch-events stopped")
            return 0
        try:
            payload = get_bridge_events(job_id, cfg)
        except Exception as exc:
            print(f"\n[bridge-client] {prefix}watch-events error: {exc}")
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
                parts = [str(ts), str(event_type)]
                if workflow:
                    parts.append(str(workflow))
                if status:
                    parts.append(f"status={status}")
                if conclusion:
                    parts.append(f"conclusion={conclusion}")
                if message:
                    parts.append(f"- {message}")
                print("\n" + prefix + " | ".join(parts))
            seen = len(events)
        else:
            dots = (dots + 1) % 4
            print(f"\r[bridge-client] {prefix}watching events{'.' * dots}   ", end="", flush=True)
        time.sleep(cfg.poll_interval_seconds)

    print(f"\n[bridge-client] {prefix}watch-events timeout")
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


def run_push_ci_server_flow(task: str, cfg: Config, *, watch: bool = False) -> int:
    hello = bridge_hello(cfg)
    print(f"[bridge-client] hello: {hello.get('message', 'ok')}")
    session_context = build_session_context_excerpt(cfg)
    if session_context and session_context.get("excerpt"):
        print(
            "[bridge-client] session context loaded "
            f"({session_context.get('message_count', 0)} messages)"
        )
    commit = push_commit(cfg)
    print(f"[bridge-client] pushed commit={commit[:12]}")

    ci_job_id = f"ci-{uuid.uuid4().hex}"
    print(f"[bridge-client] ci_job_id={ci_job_id}")
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

    job_id = trigger_server(task, commit, cfg, session_context=session_context)
    print(f"[bridge-client] server_job_id={job_id}")
    send_bridge_event(
        cfg,
        job_id=job_id,
        event_type="ci_status",
        task=task,
        commit=commit,
        message="GitHub CI success bo'ldi, endi server tekshiruvi boshlandi.",
        workflow="GitHub Actions",
        status="completed",
        conclusion="success",
    )
    print(f"[bridge-client] triggered server checks, job_id={job_id}")

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
    send_telegram_notification(result, cfg)
    return summarize_result(result)


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
    print("  python bridge/bridge_client.py push \"task description\" [--watch]")
    print("  python bridge/bridge_client.py wait <job_id>")
    print("  python bridge/bridge_client.py events <job_id>")
    print("  python bridge/bridge_client.py watch-events <job_id>")
    print("  python bridge/bridge_client.py next-task")
    print("  python bridge/bridge_client.py bridge-push-next [--watch]")
    return 1


def main() -> int:
    cfg = load_config()
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
        watch = "--watch" in sys.argv[3:]
        return run_push_ci_server_flow(task, cfg, watch=watch)

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
        watch = "--watch" in sys.argv[2:]
        return run_push_ci_server_flow(task, cfg, watch=watch)

    return usage()


if __name__ == "__main__":
    raise SystemExit(main())
