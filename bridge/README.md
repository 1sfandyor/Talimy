# Talimy Bridge (Laptop <-> Server Codex)

Bu bridge Talimy workflow uchun moslashtirilgan:

- Laptop Codex `git push` qiladi
- Bridge server trigger oladi
- Server repo `git pull --ff-only` qiladi
- Deterministic checklar (`bun run typecheck/lint`) ishga tushadi
- (Ixtiyoriy) server Codex review JSON qaytaradi
- Natija laptopga JSON ko'rinishida qaytadi

## Muhim farqlar (prototipdan)

- `docReja/Reja.md` tracker qatorlarini o'qiydi (`next-task`)
- `shared_secret` bilan HTTP auth (`X-Bridge-Token`)
- Natija `job_id` bo'yicha olinadi (race condition kamayadi)
- Server checklar config orqali mapping qilinadi (`api`, `web`, `default`)
- `task_check_mapping` orqali `docReja` task raqamiga qarab check set tanlanadi (masalan `2.x -> api`)
- GitHub Actions CI holatini `gh` CLI orqali poll qiladi (pushdan keyin)
- Telegram botga task yakuni bo'yicha xabar yuborishi mumkin
- `TASKS.md` checkbox formatiga bog'lanmagan

## 1) Konfiguratsiya (`bridge/bridge_config.json`)

To'ldiring:

- `server_host` (WireGuard IP tavsiya: `10.66.66.x`)
- `shared_secret`
- `server_repo_path`
- `laptop_repo_path`

## 2) Serverda ishga tushirish

```bash
cd /path/to/talimy
python3 bridge/bridge_server.py
```

Tavsiya: `tmux`/`screen` ichida ishlatish.

## 3) Laptopdan ishlatish

Prerequisite:

- `gh` CLI o'rnatilgan va login qilingan (`gh auth status`)

Bridge salomlashish testi:

```bash
python bridge/bridge_client.py hello
```

Manual task:

```bash
python bridge/bridge_client.py push "2.12 Exams Module smoke test"
```

Reja tracker bo'yicha keyingi taskni ko'rish:

```bash
python bridge/bridge_client.py next-task
```

Keyingi task nomi bilan push + trigger:

```bash
python bridge/bridge_client.py bridge-push-next
```

CI/bridge event tarixini ko'rish (`job_id` bo'yicha):

```bash
python bridge/bridge_client.py events <job_id>
```

## 4) Natija formati

Server `/result?job_id=...` endpoint JSON qaytaradi:

- `status`
- `tests_passed`
- `errors[]`
- `warnings[]`
- `suggestions[]`
- `next_action`
- `checks[]` (buyruqlar stdout/stderr bilan)
- `codex_review` (yoqilgan bo'lsa)

Server `/events?job_id=...` endpoint event timeline qaytaradi:

- `hello`
- `ci_status` (`queued/in_progress/completed`, `success/failure`)

`push` / `bridge-push-next` oqimi:

1. `git push`
2. GitHub Actions CI wait (`github_ci` config bo'yicha)
3. CI success bo'lsa bridge server trigger
4. Server deterministic checks + optional server Codex review
5. Telegram notify (yoqilgan bo'lsa)

CI polling paytida client har workflow status o'zgarishini (`queued/in_progress/completed`) serverga event qilib yuboradi va server `ack` qaytaradi:

- success: `... success bo'ldi, kutib turaman`
- failure: `... xato bo'ldi, tuzatib qayta yuboring`

## 5) Tavsiya etiladigan server check mapping

`bridge_config.json` ichida `server_checks`ni Talimy taskiga moslab saqlang:

- `api`: `bun run typecheck --filter=api`, `bun run lint --filter=api`
- `web`: `bun run typecheck --filter=web`, `bun run lint --filter=web`

`task_check_mapping` misol:

- `2.x` -> `api` (Phase 2 backend)
- `3.x`..`12.x` -> `web` (frontend/UI/panels)
- `16.x`, `17.x` -> `default` (custom checklarni qo'shasiz)

CI/Dokploy verification alohida qoladi; bridge local/server smoke checks uchun ishlatiladi.

## 6) Qo'shimcha config (GitHub CI + Telegram)

`bridge_config.json` ichida:

- `github_ci.enabled`
- `github_ci.repo` (`owner/repo`)
- `github_ci.workflows` (kuzatiladigan workflow nomlari)
- `telegram.enabled`
- `telegram.bot_token`
- `telegram.chat_id`
