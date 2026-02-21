# Release Notes - 2026-02-21

## Summary

- Restored stable CI/CD and Dokploy runtime behavior for `web`, `platform`, and `api`.
- Fixed API production startup and Sentry verification flow.
- Added deploy-time image verification in GitHub Actions for safer rollouts.

## Changes

- CI workflows:
  - Updated `.github/workflows/cd-api.yml`, `.github/workflows/cd-web.yml`, `.github/workflows/cd-platform.yml`.
  - Added image verification steps (`CMD`, entrypoint/workdir logging, artifact checks).
  - Fixed GHCR image reference formatting (lowercase + short SHA tag).
- Docker runtime/build:
  - Updated `apps/web/Dockerfile` and `apps/api/Dockerfile`.
  - Standardized Bun command format to `bun run --cwd ...`.
  - Enforced build artifact presence during image build:
    - Web: `.next/BUILD_ID`
    - API: `dist/main(.js)`
- API dependencies:
  - Added `class-validator` and `class-transformer` to `apps/api/package.json` dependencies.
- Sentry:
  - Verified Sentry event delivery via debug endpoint.
  - Removed temporary production test route from `apps/api/src/app.controller.ts`.
- Domain UX:
  - Updated `apps/web/src/app/(marketing)/page.tsx` to render distinct title/subtitle for `platform.talimy.space` vs `talimy.space`.

## Current Status

- `https://talimy.space` -> healthy
- `https://platform.talimy.space` -> healthy
- `https://api.talimy.space/api/health` -> healthy
