# TALIMY - Execution Plan v3 (0 -> 100%, Full Detail)

Last updated: 2026-02-21
Source baseline: `reja.txt` (all subtasks preserved)
Status: In execution (track by phase/task status markers below)

## 1. 100% completion definition

1. All phases (FAZA 0..17) pass entry and exit gates.
2. Every subtask in this file is completed with acceptance met.
3. CI passes: lint, typecheck, unit, integration, e2e.
4. Production deploy passes smoke checks with rollback path validated.

## 2. Global DoD (applies to every subtask)

1. Implemented code/config/docs for subtask scope.
2. No broken imports/routes/types in touched areas.
3. Lint and typecheck pass for affected workspace(s).
4. Tests added/updated as needed and passing.
5. Security and access rules applied where relevant.
6. Commit message is clear and traceable to subtask ID.

## 2.1 Progress Tracking Rules (single source of truth)

1. A subtask is `Not Started` by default unless an explicit status/evidence is added.
2. `In Progress` and `Completed` states must be set only after real local verification.
3. Acceptance table text describes target outcomes, not pre-claimed completion.
4. If task-level status exists, it overrides implicit defaults for that task only.
5. For reporting, `4.2 Task Status Tracker` is the canonical task status view.

## 2.2 Acceptance Evidence Rules

1. For code changes: include at least one concrete evidence path (file and/or command result).
2. For infra/deploy changes: include concrete artifact proof (workflow file, domain/DNS entry, deployment output, or runbook update).
3. Generic checks are mandatory but conditional: lint/typecheck always for code; tests only when applicable.

## 2.3 Ownership and Approval Rules

1. `Phase Owner (default)` means coordinator for the phase.
2. `Task Owner` is directly accountable for delivery and acceptance proof.
3. Completion approval is done by Task Owner; cross-team tasks require involved owners to confirm evidence.

## 2.4 Tracker Sync Checklist (mandatory on every status change)

1. Update `4.1 Phase Status Tracker`.
2. Update `4.2 Task Status Tracker`.
3. Update the corresponding Task section `- **Status**` marker (if present).
4. Add or refresh Evidence paths for the changed status.

## 3. Architecture constraints (fixed)

1. Single web app (`apps/web`) + proxy subdomain routing.
2. Canonical routes: `/admin/finance/payments`, `/admin/finance/invoices`, `/admin/notices`, `/teacher/notices`, `/student/notices`.
3. Database package name is `packages/database`.

## 4. Detailed plan by phase/task/subtask

## 4.1 Phase Status Tracker (single view)

| Phase   | Status         | Updated At | Evidence                                                                                                                                                                                 |
| ------- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FAZA 0  | 🟢 Completed   | 2026-02-20 | `docReja/Reja.md` (FAZA 0 Exit Gate status)                                                                                                                                              |
| FAZA 1  | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/*`, `packages/database/src/relations.ts`, `packages/database/src/migrate.ts`, `packages/database/src/seed/*`, `packages/database/drizzle/0000_initial.sql` |
| FAZA 2  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 3  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 4  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 5  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 6  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 7  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 8  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 9  | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 10 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 11 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 12 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 13 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 14 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 15 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 16 | ⚪ Not Started | -          | -                                                                                                                                                                                        |
| FAZA 17 | ⚪ Not Started | -          | -                                                                                                                                                                                        |

## 4.2 Task Status Tracker (detailed view)

| Task | Name                                           | Status         | Updated At | Evidence                                                                                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------- | -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1  | Monorepo Initialization                        | 🟢 Completed   | 2026-02-20 | `package.json`, `turbo.json`, `tsconfig.base.json`, `.prettierrc`, `commitlint.config.js`, `lint-staged.config.js`                                                                                                                                                                         |
| 0.2  | Shared Config Packages                         | 🟢 Completed   | 2026-02-20 | `packages/config-typescript/*`, `packages/config-eslint/*`, `packages/config-tailwind/tailwind.config.ts`                                                                                                                                                                                  |
| 0.3  | Shared Types Package (`packages/shared`)       | 🟢 Completed   | 2026-02-20 | `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/types/index.ts`                                                                                                                                                                                      |
| 1.1  | Database Package Setup                         | 🟢 Completed   | 2026-02-20 | `packages/database/drizzle.config.ts`, `packages/database/src/client.ts`, `packages/database/src/index.ts`, `packages/database/src/migrate.ts`                                                                                                                                             |
| 1.2  | Core Schema                                    | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/tenants.ts`, `packages/database/src/schema/users.ts`, `packages/database/src/schema/roles.ts`, `packages/database/src/schema/permissions.ts`, `packages/database/src/schema/sessions.ts`, `packages/database/src/schema/audit-logs.ts`                       |
| 1.3  | Education Schema                               | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/academic-years.ts`, `packages/database/src/schema/terms.ts`, `packages/database/src/schema/classes.ts`, `packages/database/src/schema/sections.ts`, `packages/database/src/schema/subjects.ts`, `packages/database/src/schema/schedules.ts`                  |
| 1.4  | People Schema                                  | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/teachers.ts`, `packages/database/src/schema/students.ts`, `packages/database/src/schema/parents.ts`, `packages/database/src/schema/parent-student.ts`                                                                                                        |
| 1.5  | Attendance Schema                              | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/attendance.ts`, `packages/database/src/schema/attendance-settings.ts`                                                                                                                                                                                        |
| 1.6  | Grades & Exams Schema                          | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/grade-scales.ts`, `packages/database/src/schema/grades.ts`, `packages/database/src/schema/exams.ts`, `packages/database/src/schema/exam-results.ts`, `packages/database/src/schema/assignments.ts`, `packages/database/src/schema/assignment-submissions.ts` |
| 1.7  | Finance Schema                                 | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/fee-structures.ts`, `packages/database/src/schema/payments.ts`, `packages/database/src/schema/payment-plans.ts`, `packages/database/src/schema/invoices.ts`                                                                                                  |
| 1.8  | Communication Schema                           | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/notices.ts`, `packages/database/src/schema/events.ts`, `packages/database/src/schema/notifications.ts`, `packages/database/src/schema/messages.ts`                                                                                                           |
| 1.9  | AI Schema                                      | 🟢 Completed   | 2026-02-20 | `packages/database/src/schema/ai-conversations.ts`, `packages/database/src/schema/ai-insights.ts`, `packages/database/src/schema/ai-reports.ts`                                                                                                                                            |
| 1.10 | Relations & Migrations                         | 🟢 Completed   | 2026-02-20 | `packages/database/src/relations.ts`, `packages/database/src/migrate.ts`, `packages/database/src/seed/*`, `packages/database/drizzle/0000_initial.sql`                                                                                                                                     |
| 2.1  | NestJS Project Setup                           | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.2  | Common Utilities                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.3  | Auth Module                                    | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.4  | Tenants Module (Platform Admin)                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.5  | Users Module                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.6  | Teachers Module                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.7  | Students Module                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.8  | Parents Module                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.9  | Classes Module                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.10 | Attendance Module                              | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.11 | Grades Module                                  | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.12 | Exams Module                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.13 | Assignments Module                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.14 | Schedule Module                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.15 | Finance Module                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.16 | Notices Module                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.17 | Notifications Module + Real-time               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.18 | Calendar Module                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.19 | Upload Module (Cloudflare R2)                  | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.20 | AI Module (Claude API)                         | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.21 | Email Module (Resend)                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.22 | SMS Module (Twilio)                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.23 | Queue Module (BullMQ)                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.24 | Cache Module (Self-hosted Redis via WireGuard) | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.25 | Audit Module                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 2.26 | tRPC Integration                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.1  | Next.js Project Setup                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.2  | Proxy (Critical)                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.3  | Providers Setup                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.4  | Zustand Stores                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.5  | API Client Setup                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.6  | Custom Hooks                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.7  | Navigation Config                              | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 3.8  | i18n Setup                                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 4.1  | shadcn/ui Primitives (packages/ui)             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 4.2  | Data Table Component                           | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 4.3  | Custom Components                              | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 5.1  | App Shell                                      | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 5.2  | Sidebar                                        | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 5.3  | Header                                         | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 6.1  | Marketing Layout                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 6.2  | Landing Page                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 6.3  | Other Public Pages                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 7.1  | Auth Pages                                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 8.1  | Platform Layout                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 8.2  | Platform Dashboard                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 8.3  | Platform Dashboard Sub-pages                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 8.4  | Schools Management                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 8.5  | Platform Settings                              | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.1  | Admin Layout                                   | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.2  | Admin Dashboard                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.3  | Teachers Management                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.4  | Students Management                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.5  | Classes Management                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.6  | Attendance Management                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.7  | Finance                                        | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.8  | Exams                                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.9  | Schedule                                       | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.10 | Notices & Calendar                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 9.11 | Admin Profile & Settings                       | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.1 | Teacher Layout & Dashboard                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.2 | Teacher - Students                             | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.3 | Teacher - Attendance                           | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.4 | Teacher - Assignments                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.5 | Teacher - Grades                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.6 | Teacher - Exams                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 10.7 | Teacher - Other                                | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 11.1 | Student Layout & Dashboard                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 11.2 | Student Pages                                  | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 12.1 | Parent Layout & Pages                          | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 13.1 | Real-time Infrastructure                       | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 13.2 | Notification System                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 13.3 | Real-time Events                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 14.1 | AI Service                                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 14.2 | Student AI Insights                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 14.3 | Admin AI Reports                               | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 14.4 | Parent Telegram Bot (Optional)                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 15.1 | SEO                                            | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 15.2 | Performance                                    | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 15.3 | Security                                       | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 16.1 | Backend Tests                                  | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 16.2 | Frontend Tests                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 17.1 | GitHub Actions                                 | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 17.2 | Deployment Config                              | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |
| 17.3 | Monitoring                                     | ⚪ Not Started | -          | -                                                                                                                                                                                                                                                                                          |

## FAZA 0: MONOREPO INFRASTRUKTURA VA SETUP

**Maqsad**: Loyihaning asosiy skeletini yaratish
**Phase Owner (default)**: Platform Lead
**Entry Dependency**: None

### Task 0.1: Monorepo Initialization

- **Task Owner**: Platform Lead
- **Task Dependency**: FAZA 0 entry gate
- **Task Estimate**: 19h

| Subtask ID | Work item                                                                                                                 | Owner         | Estimate | Dependency        | Acceptance                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.1      | bun init, package.json workspaces sozlash (`packages/*`, `apps/*`, `tooling/*`)                                           | Platform Lead | 2h       | FAZA 0 entry gate | Target outcome: bun init, package.json workspaces sozlash (`packages/*`, `apps/*`, `tooling/*`); verification: lint/typecheck pass; tests when applicable                                                       |
| 0.1.2      | turbo.json yaratish (build, dev, lint, typecheck pipeline)                                                                | Platform Lead | 2h       | 0.1.1             | Target outcome: turbo.json yaratish (build, dev, lint, typecheck pipeline); verification: lint/typecheck pass; tests when applicable                                                                            |
| 0.1.3      | Root package.json scripts (dev, build, lint, format, typecheck, db:\*)                                                    | Platform Lead | 3h       | 0.1.2             | Target outcome: Root package.json scripts (dev, build, lint, format, typecheck, db:\*); verification: lint/typecheck pass; tests when applicable                                                                |
| 0.1.4      | Root tsconfig.base.json (strict mode, path aliases)                                                                       | Platform Lead | 3h       | 0.1.3             | Target outcome: Root tsconfig.base.json (strict mode, path aliases); verification: lint/typecheck pass; tests when applicable                                                                                   |
| 0.1.5      | .gitignore, .prettierrc, .eslintrc.js, commitlint.config.js                                                               | Platform Lead | 3h       | 0.1.4             | Target outcome: .gitignore, .prettierrc, .eslintrc.js, commitlint.config.js; verification: lint/typecheck pass; tests when applicable                                                                           |
| 0.1.6      | .husky pre-commit (lint-staged), commit-msg (commitlint)                                                                  | Platform Lead | 2h       | 0.1.5             | Target outcome: .husky pre-commit (lint-staged), commit-msg (commitlint); verification: lint/typecheck pass; tests when applicable                                                                              |
| 0.1.7      | Remote infra ulanishini sozlash (Self-hosted Supabase PostgreSQL + Redis via WireGuard, local container talab qilinmaydi) | Platform Lead | 2h       | 0.1.6             | Target outcome: Remote infra ulanishini sozlash (Self-hosted Supabase PostgreSQL + Redis via WireGuard, local container talab qilinmaydi); verification: remote connection check logs + env mapping doc updated |
| 0.1.8      | .env.example barcha kerakli env variablalar bilan                                                                         | Platform Lead | 2h       | 0.1.7             | Target outcome: .env.example barcha kerakli env variablalar bilan; verification: lint/typecheck pass; tests when applicable                                                                                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 0.2: Shared Config Packages

- **Task Owner**: Platform Lead
- **Task Dependency**: Task 0.1 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.2.1      | `packages/config-typescript` - base.json, nextjs.json, nestjs.json                            | Platform Lead | 3h       | 0.1.8      | Target outcome: `packages/config-typescript` - base.json, nextjs.json, nestjs.json; verification: lint/typecheck pass; tests when applicable                            |
| 0.2.2      | `packages/config-eslint` - base.js, next.js, nest.js                                          | Platform Lead | 3h       | 0.2.1      | Target outcome: `packages/config-eslint` - base.js, next.js, nest.js; verification: lint/typecheck pass; tests when applicable                                          |
| 0.2.3      | `packages/config-tailwind` - shared Tailwind preset (optional compatibility for v4 CSS-first) | Platform Lead | 3h       | 0.2.2      | Target outcome: `packages/config-tailwind` - shared Tailwind preset (optional compatibility for v4 CSS-first); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 0.3: Shared Types Package (`packages/shared`)

- **Task Owner**: Platform Lead
- **Task Dependency**: Task 0.2 completed
- **Task Estimate**: 8h

| Subtask ID | Work item                                                                                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 0.3.1      | `packages/shared` package skeleton: package.json + tsconfig + folder structure (`types/validators/constants/utils`)      | Platform Lead | 1h       | 0.2.3      | Target outcome: package skeleton and folder tree ready; verification: lint/typecheck pass; tests when applicable |
| 0.3.2      | Barrel exports yaratish: `src/index.ts`, `types/index.ts`, `validators/index.ts`, `constants/index.ts`, `utils/index.ts` | Platform Lead | 2h       | 0.3.1      | Target outcome: barrel export structure ready; verification: lint/typecheck pass; tests when applicable          |
| 0.3.3      | Placeholder type files yaratish (`auth/tenant/teacher/student/...`) with module-safe minimal exports                     | Platform Lead | 1h       | 0.3.2      | Target outcome: placeholder type modules ready; verification: lint/typecheck pass; tests when applicable         |
| 0.3.4      | Placeholder validator files yaratish (`*.schema.ts`) with module-safe minimal exports                                    | Platform Lead | 1h       | 0.3.3      | Target outcome: placeholder validator modules ready; verification: lint/typecheck pass; tests when applicable    |
| 0.3.5      | Placeholder constants files (`roles/permissions/gender/status`) with module-safe minimal exports                         | Platform Lead | 1h       | 0.3.4      | Target outcome: placeholder constants modules ready; verification: lint/typecheck pass; tests when applicable    |
| 0.3.6      | Placeholder utils files (`date/format/helpers`) with module-safe minimal exports                                         | Platform Lead | 1h       | 0.3.5      | Target outcome: placeholder utils modules ready; verification: lint/typecheck pass; tests when applicable        |
| 0.3.7      | Shared package import smoke-check in web/api (`@talimy/shared`)                                                          | Platform Lead | 0.5h     | 0.3.6      | Target outcome: shared package import path resolves; verification: lint/typecheck pass; tests when applicable    |
| 0.3.8      | Scope boundary note: full domain types + full Zod schemas deferred to FAZA 1/2 after DB/API contracts are finalized      | Platform Lead | 0.5h     | 0.3.7      | Target outcome: phase boundary documented and accepted; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.
- **Note**: FAZA 0 includes only shared skeleton and module-safe placeholders. Full domain type definitions and full validator logic are completed in FAZA 1/2.

### FAZA 0 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.
   **Status**: Completed (2026-02-20)

---

## FAZA 1: DATABASE SCHEMA VA ORM

**Maqsad**: Drizzle ORM bilan to'liq database schema yaratish
**Phase Owner (default)**: Data Lead
**Entry Dependency**: FAZA 0 exit gate
**Status**: Completed (2026-02-20)

### Task 1.1: Database Package Setup

- **Task Owner**: Data Lead
- **Task Dependency**: FAZA 1 entry gate
- **Task Estimate**: 12h

| Subtask ID | Work item                                                            | Owner     | Estimate | Dependency        | Acceptance                                                                                                                                     |
| ---------- | -------------------------------------------------------------------- | --------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1      | `packages/database` init, drizzle-orm, postgres/pg driver install    | Data Lead | 2h       | FAZA 1 entry gate | Target outcome: `packages/database` init, drizzle-orm, postgres/pg driver install; verification: lint/typecheck pass; tests when applicable    |
| 1.1.2      | drizzle.config.ts (connection string, schema path, migration output) | Data Lead | 6h       | 1.1.1             | Target outcome: drizzle.config.ts (connection string, schema path, migration output); verification: lint/typecheck pass; tests when applicable |
| 1.1.3      | client.ts (Supabase self-hosted PostgreSQL connection pool)          | Data Lead | 2h       | 1.1.2             | Target outcome: client.ts (Supabase self-hosted PostgreSQL connection pool); verification: lint/typecheck pass; tests when applicable          |
| 1.1.4      | index.ts (drizzle instance export)                                   | Data Lead | 2h       | 1.1.3             | Target outcome: index.ts (drizzle instance export); verification: lint/typecheck pass; tests when applicable                                   |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.2: Core Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.1 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                                                                                                | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | --------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.2.1      | `tenants.ts` - id, name, slug, domain, logo, status, genderPolicy, plan, createdAt, updatedAt                            | Data Lead | 2h       | 1.1.4      | Target outcome: `tenants.ts` - id, name, slug, domain, logo, status, genderPolicy, plan, createdAt, updatedAt; verification: lint/typecheck pass; tests when applicable                  |
| 1.2.2      | `users.ts` - id, email, phone, passwordHash, firstName, lastName, role, tenantId, avatar, isActive, lastLogin, createdAt | Data Lead | 2h       | 1.2.1      | Target outcome: `users.ts` - id, email, phone, passwordHash, firstName, lastName, role, tenantId, avatar, isActive, lastLog...; verification: lint/typecheck pass; tests when applicable |
| 1.2.3      | `roles.ts` - id, name (platform_admin, school_admin, teacher, student, parent), tenantId                                 | Data Lead | 3h       | 1.2.2      | Target outcome: `roles.ts` - id, name (platform_admin, school_admin, teacher, student, parent), tenantId; verification: lint/typecheck pass; tests when applicable                       |
| 1.2.4      | `permissions.ts` - id, roleId, resource, action, genderScope                                                             | Data Lead | 2h       | 1.2.3      | Target outcome: `permissions.ts` - id, roleId, resource, action, genderScope; verification: lint/typecheck pass; tests when applicable                                                   |
| 1.2.5      | `sessions.ts` - id, userId, tenantId, token, expiresAt, ipAddress, userAgent                                             | Data Lead | 2h       | 1.2.4      | Target outcome: `sessions.ts` - id, userId, tenantId, token, expiresAt, ipAddress, userAgent; verification: lint/typecheck pass; tests when applicable                                   |
| 1.2.6      | `audit_logs.ts` - id, userId, tenantId, action, resource, resourceId, oldData, newData, ipAddress, timestamp             | Data Lead | 2h       | 1.2.5      | Target outcome: `audit_logs.ts` - id, userId, tenantId, action, resource, resourceId, oldData, newData, ipAddress, timestamp; verification: lint/typecheck pass; tests when applicable   |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.3: Education Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.2 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                                         | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------- | --------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.3.1      | `academic_years.ts` - id, tenantId, name, startDate, endDate, isCurrent                           | Data Lead | 2h       | 1.2.6      | Target outcome: `academic_years.ts` - id, tenantId, name, startDate, endDate, isCurrent; verification: lint/typecheck pass; tests when applicable                           |
| 1.3.2      | `terms.ts` - id, academicYearId, name, startDate, endDate, termNumber                             | Data Lead | 2h       | 1.3.1      | Target outcome: `terms.ts` - id, academicYearId, name, startDate, endDate, termNumber; verification: lint/typecheck pass; tests when applicable                             |
| 1.3.3      | `classes.ts` - id, tenantId, name, grade, section, capacity, academicYearId                       | Data Lead | 2h       | 1.3.2      | Target outcome: `classes.ts` - id, tenantId, name, grade, section, capacity, academicYearId; verification: lint/typecheck pass; tests when applicable                       |
| 1.3.4      | `sections.ts` - id, classId, name, maxStudents                                                    | Data Lead | 2h       | 1.3.3      | Target outcome: `sections.ts` - id, classId, name, maxStudents; verification: lint/typecheck pass; tests when applicable                                                    |
| 1.3.5      | `subjects.ts` - id, tenantId, name, code, description, isActive                                   | Data Lead | 2h       | 1.3.4      | Target outcome: `subjects.ts` - id, tenantId, name, code, description, isActive; verification: lint/typecheck pass; tests when applicable                                   |
| 1.3.6      | `schedules.ts` - id, tenantId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room | Data Lead | 2h       | 1.3.5      | Target outcome: `schedules.ts` - id, tenantId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.4: People Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.3 completed
- **Task Estimate**: 8h

| Subtask ID | Work item                                                                                                                      | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.4.1      | `teachers.ts` - id, userId, tenantId, employeeId, gender, dateOfBirth, joinDate, qualification, specialization, salary, status | Data Lead | 2h       | 1.3.6      | Target outcome: `teachers.ts` - id, userId, tenantId, employeeId, gender, dateOfBirth, joinDate, qualification, specializat...; verification: lint/typecheck pass; tests when applicable |
| 1.4.2      | `students.ts` - id, userId, tenantId, studentId, gender, dateOfBirth, classId, enrollmentDate, status, bloodGroup, address     | Data Lead | 2h       | 1.4.1      | Target outcome: `students.ts` - id, userId, tenantId, studentId, gender, dateOfBirth, classId, enrollmentDate, status, bloo...; verification: lint/typecheck pass; tests when applicable |
| 1.4.3      | `parents.ts` - id, userId, tenantId, phone, occupation, address, relationship                                                  | Data Lead | 2h       | 1.4.2      | Target outcome: `parents.ts` - id, userId, tenantId, phone, occupation, address, relationship; verification: lint/typecheck pass; tests when applicable                                  |
| 1.4.4      | `parent_student.ts` - id, tenantId, parentId, studentId (many-to-many)                                                         | Data Lead | 2h       | 1.4.3      | Target outcome: `parent_student.ts` - id, tenantId, parentId, studentId (many-to-many); verification: tenant-scoped relation checks + lint/typecheck pass                                |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.5: Attendance Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.4 completed
- **Task Estimate**: 4h

| Subtask ID | Work item                                                                                                      | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.5.1      | `attendance.ts` - id, tenantId, studentId, classId, date, status (present/absent/late/excused), markedBy, note | Data Lead | 2h       | 1.4.4      | Target outcome: `attendance.ts` - id, tenantId, studentId, classId, date, status (present/absent/late/excused), markedBy, note; verification: lint/typecheck pass; tests when applicable |
| 1.5.2      | `attendance_settings.ts` - id, tenantId, lateThreshold, absentAlertThreshold, autoNotifyParent                 | Data Lead | 2h       | 1.5.1      | Target outcome: `attendance_settings.ts` - id, tenantId, lateThreshold, absentAlertThreshold, autoNotifyParent; verification: lint/typecheck pass; tests when applicable                 |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.6: Grades & Exams Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.5 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                                                         | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | --------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.6.1      | `grade_scales.ts` - id, tenantId, name, minScore, maxScore, grade, gpa                                            | Data Lead | 2h       | 1.5.2      | Target outcome: `grade_scales.ts` - id, tenantId, name, minScore, maxScore, grade, gpa; verification: lint/typecheck pass; tests when applicable                                                      |
| 1.6.2      | `grades.ts` - id, tenantId, studentId, subjectId, termId, score, grade, teacherId, comment                        | Data Lead | 2h       | 1.6.1      | Target outcome: `grades.ts` - id, tenantId, studentId, subjectId, termId, score, grade, teacherId, comment; verification: lint/typecheck pass; tests when applicable                                  |
| 1.6.3      | `exams.ts` - id, tenantId, name, type (midterm/final/quiz), subjectId, classId, date, totalMarks, duration        | Data Lead | 2h       | 1.6.2      | Target outcome: `exams.ts` - id, tenantId, name, type (midterm/final/quiz), subjectId, classId, date, totalMarks, duration; verification: lint/typecheck pass; tests when applicable                  |
| 1.6.4      | `exam_results.ts` - id, tenantId, examId, studentId, score, grade, rank                                           | Data Lead | 2h       | 1.6.3      | Target outcome: `exam_results.ts` - id, tenantId, examId, studentId, score, grade, rank; verification: tenant-scoped exam-result query checks + lint/typecheck pass                                   |
| 1.6.5      | `assignments.ts` - id, tenantId, teacherId, subjectId, classId, title, description, dueDate, totalPoints, fileUrl | Data Lead | 2h       | 1.6.4      | Target outcome: `assignments.ts` - id, tenantId, teacherId, subjectId, classId, title, description, dueDate, totalPoints, f...; verification: lint/typecheck pass; tests when applicable              |
| 1.6.6      | `assignment_submissions.ts` - id, tenantId, assignmentId, studentId, fileUrl, submittedAt, score, feedback        | Data Lead | 2h       | 1.6.5      | Target outcome: `assignment_submissions.ts` - id, tenantId, assignmentId, studentId, fileUrl, submittedAt, score, feedback; verification: tenant-scoped submission query checks + lint/typecheck pass |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.7: Finance Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.6 completed
- **Task Estimate**: 8h

| Subtask ID | Work item                                                                                                   | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------- | --------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.7.1      | `fee_structures.ts` - id, tenantId, name, amount, frequency (monthly/termly/yearly), classId, description   | Data Lead | 2h       | 1.6.6      | Target outcome: `fee_structures.ts` - id, tenantId, name, amount, frequency (monthly/termly/yearly), classId, description; verification: lint/typecheck pass; tests when applicable   |
| 1.7.2      | `payments.ts` - id, tenantId, studentId, amount, method, status (pending/paid/overdue), date, receiptNumber | Data Lead | 2h       | 1.7.1      | Target outcome: `payments.ts` - id, tenantId, studentId, amount, method, status (pending/paid/overdue), date, receiptNumber; verification: lint/typecheck pass; tests when applicable |
| 1.7.3      | `payment_plans.ts` - id, tenantId, studentId, feeStructureId, totalAmount, paidAmount, dueDate              | Data Lead | 2h       | 1.7.2      | Target outcome: `payment_plans.ts` - id, tenantId, studentId, feeStructureId, totalAmount, paidAmount, dueDate; verification: lint/typecheck pass; tests when applicable              |
| 1.7.4      | `invoices.ts` - id, tenantId, studentId, items (jsonb), totalAmount, status, issuedDate, dueDate            | Data Lead | 2h       | 1.7.3      | Target outcome: `invoices.ts` - id, tenantId, studentId, items (jsonb), totalAmount, status, issuedDate, dueDate; verification: lint/typecheck pass; tests when applicable            |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.8: Communication Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.7 completed
- **Task Estimate**: 8h

| Subtask ID | Work item                                                                                             | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------- | --------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.8.1      | `notices.ts` - id, tenantId, title, content, targetRole, priority, createdBy, publishDate, expiryDate | Data Lead | 2h       | 1.7.4      | Target outcome: `notices.ts` - id, tenantId, title, content, targetRole, priority, createdBy, publishDate, expiryDate; verification: lint/typecheck pass; tests when applicable |
| 1.8.2      | `events.ts` - id, tenantId, title, description, startDate, endDate, location, type                    | Data Lead | 2h       | 1.8.1      | Target outcome: `events.ts` - id, tenantId, title, description, startDate, endDate, location, type; verification: lint/typecheck pass; tests when applicable                    |
| 1.8.3      | `notifications.ts` - id, userId, tenantId, title, message, type, isRead, data (jsonb), createdAt      | Data Lead | 2h       | 1.8.2      | Target outcome: `notifications.ts` - id, userId, tenantId, title, message, type, isRead, data (jsonb), createdAt; verification: lint/typecheck pass; tests when applicable      |
| 1.8.4      | `messages.ts` - id, tenantId, senderId, receiverId, subject, body, isRead, createdAt                  | Data Lead | 2h       | 1.8.3      | Target outcome: `messages.ts` - id, tenantId, senderId, receiverId, subject, body, isRead, createdAt; verification: lint/typecheck pass; tests when applicable                  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.9: AI Schema

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.8 completed
- **Task Estimate**: 6h

| Subtask ID | Work item                                                                                        | Owner     | Estimate | Dependency | Acceptance                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------ | --------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.9.1      | `ai_conversations.ts` - id, userId, tenantId, messages (jsonb), model, tokenUsage, createdAt     | Data Lead | 2h       | 1.8.4      | Target outcome: `ai_conversations.ts` - id, userId, tenantId, messages (jsonb), model, tokenUsage, createdAt; verification: lint/typecheck pass; tests when applicable     |
| 1.9.2      | `ai_insights.ts` - id, tenantId, studentId, type, content, confidence, generatedAt               | Data Lead | 2h       | 1.9.1      | Target outcome: `ai_insights.ts` - id, tenantId, studentId, type, content, confidence, generatedAt; verification: lint/typecheck pass; tests when applicable               |
| 1.9.3      | `ai_reports.ts` - id, tenantId, type, parameters (jsonb), result (jsonb), generatedBy, createdAt | Data Lead | 2h       | 1.9.2      | Target outcome: `ai_reports.ts` - id, tenantId, type, parameters (jsonb), result (jsonb), generatedBy, createdAt; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 1.10: Relations & Migrations

- **Task Owner**: Data Lead
- **Task Dependency**: Task 1.9 completed
- **Task Estimate**: 17h

| Subtask ID | Work item                                                            | Owner     | Estimate | Dependency | Acceptance                                                                                                                                     |
| ---------- | -------------------------------------------------------------------- | --------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.10.1     | relations.ts - barcha jadvallar o'rtasida Drizzle relations aniqlash | Data Lead | 2h       | 1.9.3      | Target outcome: relations.ts - barcha jadvallar o'rtasida Drizzle relations aniqlash; verification: lint/typecheck pass; tests when applicable |
| 1.10.2     | Initial migration generate (`drizzle-kit generate`)                  | Data Lead | 6h       | 1.10.1     | Target outcome: Initial migration generate (`drizzle-kit generate`); verification: lint/typecheck pass; tests when applicable                  |
| 1.10.3     | Migration runner script (migrate.ts)                                 | Data Lead | 6h       | 1.10.2     | Target outcome: Migration runner script (migrate.ts); verification: lint/typecheck pass; tests when applicable                                 |
| 1.10.4     | Seed data yaratish (demo tenants, users, teachers, students)         | Data Lead | 3h       | 1.10.3     | Target outcome: Seed data yaratish (demo tenants, users, teachers, students); verification: lint/typecheck pass; tests when applicable         |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 1 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 2: NESTJS BACKEND API

**Maqsad**: To'liq backend API yaratish
**Phase Owner (default)**: Backend Lead
**Entry Dependency**: FAZA 1 exit gate

### Task 2.1: NestJS Project Setup

- **Task Owner**: Backend Lead
- **Task Dependency**: FAZA 2 entry gate
- **Task Estimate**: 14h

| Subtask ID | Work item                                                           | Owner        | Estimate | Dependency        | Acceptance                                                                                                                                    |
| ---------- | ------------------------------------------------------------------- | ------------ | -------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1.1      | `apps/api` init, NestJS CLI, tsconfig, nest-cli.json                | Backend Lead | 3h       | FAZA 2 entry gate | Target outcome: `apps/api` init, NestJS CLI, tsconfig, nest-cli.json; verification: lint/typecheck pass; tests when applicable                |
| 2.1.2      | Main bootstrap (CORS, global pipes, filters, interceptors, Swagger) | Backend Lead | 3h       | 2.1.1             | Target outcome: Main bootstrap (CORS, global pipes, filters, interceptors, Swagger); verification: lint/typecheck pass; tests when applicable |
| 2.1.3      | AppModule (global imports, ConfigModule, DatabaseModule)            | Backend Lead | 4h       | 2.1.2             | Target outcome: AppModule (global imports, ConfigModule, DatabaseModule); verification: lint/typecheck pass; tests when applicable            |
| 2.1.4      | Environment config (database, redis, auth, r2, email, sms, ai)      | Backend Lead | 4h       | 2.1.3             | Target outcome: Environment config (database, redis, auth, r2, email, sms, ai); verification: lint/typecheck pass; tests when applicable      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.2: Common Utilities

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.1 completed
- **Task Estimate**: 24h

| Subtask ID | Work item                                                                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2.1      | Guards: auth.guard.ts, roles.guard.ts, tenant.guard.ts, gender.guard.ts                         | Backend Lead | 4h       | 2.1.4      | Target outcome: Guards: auth.guard.ts, roles.guard.ts, tenant.guard.ts, gender.guard.ts; verification: guard matrix tests (authorized/forbidden/unauthorized) + lint/typecheck pass                            |
| 2.2.2      | Decorators: @Roles(), @CurrentUser(), @Tenant(), @GenderScope()                                 | Backend Lead | 3h       | 2.2.1      | Target outcome: Decorators: @Roles(), @CurrentUser(), @Tenant(), @GenderScope(); verification: lint/typecheck pass; tests when applicable                                                                      |
| 2.2.3      | Interceptors: logging, transform (standard API response), timeout                               | Backend Lead | 3h       | 2.2.2      | Target outcome: Interceptors: logging, transform (standard API response), timeout; verification: lint/typecheck pass; tests when applicable                                                                    |
| 2.2.4      | Filters: http-exception.filter.ts, all-exceptions.filter.ts                                     | Backend Lead | 3h       | 2.2.3      | Target outcome: Filters: http-exception.filter.ts, all-exceptions.filter.ts; verification: lint/typecheck pass; tests when applicable                                                                          |
| 2.2.5      | Pipes: zod-validation.pipe.ts                                                                   | Backend Lead | 2h       | 2.2.4      | Target outcome: Pipes: zod-validation.pipe.ts; verification: lint/typecheck pass; tests when applicable                                                                                                        |
| 2.2.6      | Backend middleware (NestJS): tenant.middleware.ts (subdomain -> tenantId), logger.middleware.ts | Backend Lead | 6h       | 2.2.5      | Target outcome: Backend middleware (NestJS): tenant.middleware.ts (subdomain -> tenantId), logger.middleware.ts; verification: tenant resolution test (`platform` vs school slug) + tenant-isolation e2e check |
| 2.2.7      | DTOs: pagination.dto.ts, api-response.dto.ts                                                    | Backend Lead | 3h       | 2.2.6      | Target outcome: DTOs: pagination.dto.ts, api-response.dto.ts; verification: lint/typecheck pass; tests when applicable                                                                                         |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.3: Auth Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.2 completed
- **Task Estimate**: 19h

| Subtask ID | Work item                                                                                  | Owner        | Estimate | Dependency | Acceptance                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------ | ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.1      | auth.module.ts + auth.service.ts (register, login, refresh, logout, forgot/reset password) | Backend Lead | 4h       | 2.2.7      | Target outcome: auth.module.ts + auth.service.ts (register, login, refresh, logout, forgot/reset password); verification: curl flow test (register -> login -> refresh -> logout) |
| 2.3.2      | JWT strategy, Local strategy, Refresh strategy                                             | Backend Lead | 2h       | 2.3.1      | Target outcome: JWT strategy, Local strategy, Refresh strategy; verification: lint/typecheck pass; tests when applicable                                                          |
| 2.3.3      | Password hashing (bcrypt), token generation                                                | Backend Lead | 2h       | 2.3.2      | Target outcome: Password hashing (bcrypt), token generation; verification: lint/typecheck pass; tests when applicable                                                             |
| 2.3.4      | Session management (Redis-backed)                                                          | Backend Lead | 4h       | 2.3.3      | Target outcome: Session management (Redis-backed); verification: Redis key lifecycle check (create/refresh/revoke) + lint/typecheck pass                                          |
| 2.3.5      | Rate limiting on auth endpoints                                                            | Backend Lead | 4h       | 2.3.4      | Target outcome: Rate limiting on auth endpoints; verification: repeated request test with 429 + rate-limit headers                                                                |
| 2.3.6      | DTOs: login, register, refresh-token                                                       | Backend Lead | 3h       | 2.3.5      | Target outcome: DTOs: login, register, refresh-token; verification: lint/typecheck pass; tests when applicable                                                                    |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.4: Tenants Module (Platform Admin)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.3 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                                              | Owner        | Estimate | Dependency | Acceptance                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.4.1      | CRUD: create, findAll (paginated, filterable), findOne, update, delete | Backend Lead | 4h       | 2.3.6      | Target outcome: CRUD: create, findAll (paginated, filterable), findOne, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.4.2      | Activate/deactivate tenant                                             | Backend Lead | 2h       | 2.4.1      | Target outcome: Activate/deactivate tenant; verification: lint/typecheck pass; tests when applicable                                             |
| 2.4.3      | Tenant statistics (students count, teachers count, revenue)            | Backend Lead | 2h       | 2.4.2      | Target outcome: Tenant statistics (students count, teachers count, revenue); verification: lint/typecheck pass; tests when applicable            |
| 2.4.4      | Billing/subscription management                                        | Backend Lead | 4h       | 2.4.3      | Target outcome: Billing/subscription management; verification: lint/typecheck pass; tests when applicable                                        |
| 2.4.5      | DTOs: create-tenant, update-tenant                                     | Backend Lead | 3h       | 2.4.4      | Target outcome: DTOs: create-tenant, update-tenant; verification: lint/typecheck pass; tests when applicable                                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.5: Users Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.4 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                        | Owner        | Estimate | Dependency | Acceptance                                                                                                                                 |
| ---------- | ---------------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.5.1      | CRUD: create, findAll (by tenant, role), findOne, update, delete | Backend Lead | 4h       | 2.4.5      | Target outcome: CRUD: create, findAll (by tenant, role), findOne, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.5.2      | Role assignment, password change, avatar upload                  | Backend Lead | 2h       | 2.5.1      | Target outcome: Role assignment, password change, avatar upload; verification: lint/typecheck pass; tests when applicable                  |
| 2.5.3      | DTOs: create-user, update-user                                   | Backend Lead | 3h       | 2.5.2      | Target outcome: DTOs: create-user, update-user; verification: lint/typecheck pass; tests when applicable                                   |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.6: Teachers Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.5 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                                                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.6.1      | CRUD: create (stepper data), findAll (paginated, filterable by gender), findOne, update, delete | Backend Lead | 4h       | 2.5.3      | Target outcome: CRUD: create (stepper data), findAll (paginated, filterable by gender), findOne, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.6.2      | Teacher's schedule, classes, subjects                                                           | Backend Lead | 2h       | 2.6.1      | Target outcome: Teacher's schedule, classes, subjects; verification: lint/typecheck pass; tests when applicable                                                           |
| 2.6.3      | Gender-based filtering (Permify integration)                                                    | Backend Lead | 6h       | 2.6.2      | Target outcome: Gender-based filtering (Permify integration); verification: lint/typecheck pass; tests when applicable                                                    |
| 2.6.4      | DTOs: create-teacher, update-teacher                                                            | Backend Lead | 3h       | 2.6.3      | Target outcome: DTOs: create-teacher, update-teacher; verification: lint/typecheck pass; tests when applicable                                                            |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.7: Students Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.6 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                                             | Owner        | Estimate | Dependency | Acceptance                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.7.1      | CRUD: create (stepper data), findAll (paginated, filterable by gender/class), findOne, update, delete | Backend Lead | 4h       | 2.6.4      | Target outcome: CRUD: create (stepper data), findAll (paginated, filterable by gender/class), findOne, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.7.2      | Student's grades, attendance, assignments summary                                                     | Backend Lead | 2h       | 2.7.1      | Target outcome: Student's grades, attendance, assignments summary; verification: lint/typecheck pass; tests when applicable                                                     |
| 2.7.3      | Gender-based filtering (Permify)                                                                      | Backend Lead | 3h       | 2.7.2      | Target outcome: Gender-based filtering (Permify); verification: lint/typecheck pass; tests when applicable                                                                      |
| 2.7.4      | DTOs: create-student, update-student                                                                  | Backend Lead | 3h       | 2.7.3      | Target outcome: DTOs: create-student, update-student; verification: lint/typecheck pass; tests when applicable                                                                  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.8: Parents Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.7 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                             | Owner        | Estimate | Dependency | Acceptance                                                                                                                      |
| ---------- | ----------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2.8.1      | CRUD: create, findAll, findOne, update, delete        | Backend Lead | 4h       | 2.7.4      | Target outcome: CRUD: create, findAll, findOne, update, delete; verification: lint/typecheck pass; tests when applicable        |
| 2.8.2      | Link/unlink student-parent relationship               | Backend Lead | 2h       | 2.8.1      | Target outcome: Link/unlink student-parent relationship; verification: lint/typecheck pass; tests when applicable               |
| 2.8.3      | Parent's children list with grades/attendance summary | Backend Lead | 2h       | 2.8.2      | Target outcome: Parent's children list with grades/attendance summary; verification: lint/typecheck pass; tests when applicable |
| 2.8.4      | DTOs: create-parent, update-parent                    | Backend Lead | 3h       | 2.8.3      | Target outcome: DTOs: create-parent, update-parent; verification: lint/typecheck pass; tests when applicable                    |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.9: Classes Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.8 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                                  | Owner        | Estimate | Dependency | Acceptance                                                                                                                           |
| ---------- | ---------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2.9.1      | CRUD: create, findAll (by tenant), findOne, update, delete | Backend Lead | 4h       | 2.8.4      | Target outcome: CRUD: create, findAll (by tenant), findOne, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.9.2      | Class students list, class teachers list                   | Backend Lead | 2h       | 2.9.1      | Target outcome: Class students list, class teachers list; verification: lint/typecheck pass; tests when applicable                   |
| 2.9.3      | Class schedule, class statistics                           | Backend Lead | 2h       | 2.9.2      | Target outcome: Class schedule, class statistics; verification: lint/typecheck pass; tests when applicable                           |
| 2.9.4      | DTOs: create-class, update-class                           | Backend Lead | 3h       | 2.9.3      | Target outcome: DTOs: create-class, update-class; verification: lint/typecheck pass; tests when applicable                           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.10: Attendance Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.9 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                    | Owner        | Estimate | Dependency | Acceptance                                                                                                             |
| ---------- | -------------------------------------------- | ------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2.10.1     | Mark attendance (bulk for class)             | Backend Lead | 2h       | 2.9.4      | Target outcome: Mark attendance (bulk for class); verification: lint/typecheck pass; tests when applicable             |
| 2.10.2     | Get attendance by student, class, date range | Backend Lead | 2h       | 2.10.1     | Target outcome: Get attendance by student, class, date range; verification: lint/typecheck pass; tests when applicable |
| 2.10.3     | Attendance reports/statistics                | Backend Lead | 2h       | 2.10.2     | Target outcome: Attendance reports/statistics; verification: lint/typecheck pass; tests when applicable                |
| 2.10.4     | Auto-notify parents if absent (BullMQ job)   | Backend Lead | 2h       | 2.10.3     | Target outcome: Auto-notify parents if absent (BullMQ job); verification: lint/typecheck pass; tests when applicable   |
| 2.10.5     | DTOs: mark-attendance, attendance-query      | Backend Lead | 3h       | 2.10.4     | Target outcome: DTOs: mark-attendance, attendance-query; verification: lint/typecheck pass; tests when applicable      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.11: Grades Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.10 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                   | Owner        | Estimate | Dependency | Acceptance                                                                                                            |
| ---------- | ------------------------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 2.11.1     | Enter grades (bulk for class/subject)       | Backend Lead | 2h       | 2.10.5     | Target outcome: Enter grades (bulk for class/subject); verification: lint/typecheck pass; tests when applicable       |
| 2.11.2     | Get grades by student, class, subject, term | Backend Lead | 2h       | 2.11.1     | Target outcome: Get grades by student, class, subject, term; verification: lint/typecheck pass; tests when applicable |
| 2.11.3     | Grade reports, GPA calculation              | Backend Lead | 2h       | 2.11.2     | Target outcome: Grade reports, GPA calculation; verification: lint/typecheck pass; tests when applicable              |
| 2.11.4     | Grade scale management                      | Backend Lead | 4h       | 2.11.3     | Target outcome: Grade scale management; verification: lint/typecheck pass; tests when applicable                      |
| 2.11.5     | DTOs: create-grade, grade-query             | Backend Lead | 3h       | 2.11.4     | Target outcome: DTOs: create-grade, grade-query; verification: lint/typecheck pass; tests when applicable             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.12: Exams Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.11 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                  | Owner        | Estimate | Dependency | Acceptance                                                                                                           |
| ---------- | ------------------------------------------ | ------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.12.1     | CRUD: create exam, update, delete          | Backend Lead | 4h       | 2.11.5     | Target outcome: CRUD: create exam, update, delete; verification: lint/typecheck pass; tests when applicable          |
| 2.12.2     | Enter exam results (bulk)                  | Backend Lead | 2h       | 2.12.1     | Target outcome: Enter exam results (bulk); verification: lint/typecheck pass; tests when applicable                  |
| 2.12.3     | Get results by exam, student               | Backend Lead | 2h       | 2.12.2     | Target outcome: Get results by exam, student; verification: lint/typecheck pass; tests when applicable               |
| 2.12.4     | Exam statistics (average, highest, lowest) | Backend Lead | 2h       | 2.12.3     | Target outcome: Exam statistics (average, highest, lowest); verification: lint/typecheck pass; tests when applicable |
| 2.12.5     | DTOs: create-exam, exam-result             | Backend Lead | 3h       | 2.12.4     | Target outcome: DTOs: create-exam, exam-result; verification: lint/typecheck pass; tests when applicable             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.13: Assignments Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.12 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                  | Owner        | Estimate | Dependency | Acceptance                                                                                                           |
| ---------- | ------------------------------------------ | ------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 2.13.1     | CRUD: create assignment, update, delete    | Backend Lead | 4h       | 2.12.5     | Target outcome: CRUD: create assignment, update, delete; verification: lint/typecheck pass; tests when applicable    |
| 2.13.2     | Submit assignment (student), file upload   | Backend Lead | 2h       | 2.13.1     | Target outcome: Submit assignment (student), file upload; verification: lint/typecheck pass; tests when applicable   |
| 2.13.3     | Grade submission (teacher)                 | Backend Lead | 2h       | 2.13.2     | Target outcome: Grade submission (teacher); verification: lint/typecheck pass; tests when applicable                 |
| 2.13.4     | Assignment statistics                      | Backend Lead | 2h       | 2.13.3     | Target outcome: Assignment statistics; verification: lint/typecheck pass; tests when applicable                      |
| 2.13.5     | DTOs: create-assignment, submit-assignment | Backend Lead | 3h       | 2.13.4     | Target outcome: DTOs: create-assignment, submit-assignment; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.14: Schedule Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.13 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                   | Owner        | Estimate | Dependency | Acceptance                                                                                                            |
| ---------- | ------------------------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 2.14.1     | CRUD: create schedule entry, update, delete | Backend Lead | 4h       | 2.13.5     | Target outcome: CRUD: create schedule entry, update, delete; verification: lint/typecheck pass; tests when applicable |
| 2.14.2     | Get schedule by class, teacher, day         | Backend Lead | 2h       | 2.14.1     | Target outcome: Get schedule by class, teacher, day; verification: lint/typecheck pass; tests when applicable         |
| 2.14.3     | Conflict detection (same teacher/room/time) | Backend Lead | 2h       | 2.14.2     | Target outcome: Conflict detection (same teacher/room/time); verification: lint/typecheck pass; tests when applicable |
| 2.14.4     | DTOs: create-schedule, schedule-query       | Backend Lead | 3h       | 2.14.3     | Target outcome: DTOs: create-schedule, schedule-query; verification: lint/typecheck pass; tests when applicable       |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.15: Finance Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.14 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.15.1     | Fee structure CRUD                              | Backend Lead | 4h       | 2.14.4     | Target outcome: Fee structure CRUD; verification: lint/typecheck pass; tests when applicable                              |
| 2.15.2     | Payment recording, payment plans                | Backend Lead | 2h       | 2.15.1     | Target outcome: Payment recording, payment plans; verification: lint/typecheck pass; tests when applicable                |
| 2.15.3     | Invoice generation                              | Backend Lead | 2h       | 2.15.2     | Target outcome: Invoice generation; verification: lint/typecheck pass; tests when applicable                              |
| 2.15.4     | Finance reports (revenue, outstanding, overdue) | Backend Lead | 2h       | 2.15.3     | Target outcome: Finance reports (revenue, outstanding, overdue); verification: lint/typecheck pass; tests when applicable |
| 2.15.5     | DTOs: create-payment, create-invoice            | Backend Lead | 3h       | 2.15.4     | Target outcome: DTOs: create-payment, create-invoice; verification: lint/typecheck pass; tests when applicable            |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.16: Notices Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.15 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                         | Owner        | Estimate | Dependency | Acceptance                                                                                                                  |
| ---------- | ------------------------------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2.16.1     | CRUD: create notice, update, delete               | Backend Lead | 4h       | 2.15.5     | Target outcome: CRUD: create notice, update, delete; verification: lint/typecheck pass; tests when applicable               |
| 2.16.2     | Target by role (all, teachers, students, parents) | Backend Lead | 2h       | 2.16.1     | Target outcome: Target by role (all, teachers, students, parents); verification: lint/typecheck pass; tests when applicable |
| 2.16.3     | Priority levels (low, medium, high, urgent)       | Backend Lead | 2h       | 2.16.2     | Target outcome: Priority levels (low, medium, high, urgent); verification: lint/typecheck pass; tests when applicable       |
| 2.16.4     | DTOs: create-notice                               | Backend Lead | 3h       | 2.16.3     | Target outcome: DTOs: create-notice; verification: lint/typecheck pass; tests when applicable                               |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.17: Notifications Module + Real-time

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.16 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                    | Owner        | Estimate | Dependency | Acceptance                                                                                                             |
| ---------- | -------------------------------------------- | ------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2.17.1     | notifications.module.ts, service, controller | Backend Lead | 4h       | 2.16.4     | Target outcome: notifications.module.ts, service, controller; verification: lint/typecheck pass; tests when applicable |
| 2.17.2     | Socket.IO gateway (notifications.gateway.ts) | Backend Lead | 4h       | 2.17.1     | Target outcome: Socket.IO gateway (notifications.gateway.ts); verification: lint/typecheck pass; tests when applicable |
| 2.17.3     | Send notification (in-app, email, SMS)       | Backend Lead | 2h       | 2.17.2     | Target outcome: Send notification (in-app, email, SMS); verification: lint/typecheck pass; tests when applicable       |
| 2.17.4     | Mark as read, get unread count               | Backend Lead | 2h       | 2.17.3     | Target outcome: Mark as read, get unread count; verification: lint/typecheck pass; tests when applicable               |
| 2.17.5     | DTOs: send-notification                      | Backend Lead | 3h       | 2.17.4     | Target outcome: DTOs: send-notification; verification: lint/typecheck pass; tests when applicable                      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.18: Calendar Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.17 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                              | Owner        | Estimate | Dependency | Acceptance                                                                                                       |
| ---------- | -------------------------------------- | ------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 2.18.1     | CRUD: create event, update, delete     | Backend Lead | 4h       | 2.17.5     | Target outcome: CRUD: create event, update, delete; verification: lint/typecheck pass; tests when applicable     |
| 2.18.2     | Get events by date range, type, tenant | Backend Lead | 2h       | 2.18.1     | Target outcome: Get events by date range, type, tenant; verification: lint/typecheck pass; tests when applicable |
| 2.18.3     | DTOs: create-event                     | Backend Lead | 3h       | 2.18.2     | Target outcome: DTOs: create-event; verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.19: Upload Module (Cloudflare R2)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.18 completed
- **Task Estimate**: 6h

| Subtask ID | Work item                                                   | Owner        | Estimate | Dependency | Acceptance                                                                                                                            |
| ---------- | ----------------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2.19.1     | upload.service.ts - R2 client, upload, delete, getSignedUrl | Backend Lead | 2h       | 2.18.3     | Target outcome: upload.service.ts - R2 client, upload, delete, getSignedUrl; verification: lint/typecheck pass; tests when applicable |
| 2.19.2     | upload.controller.ts - file upload endpoint (multipart)     | Backend Lead | 2h       | 2.19.1     | Target outcome: upload.controller.ts - file upload endpoint (multipart); verification: lint/typecheck pass; tests when applicable     |
| 2.19.3     | File type/size validation                                   | Backend Lead | 2h       | 2.19.2     | Target outcome: File type/size validation; verification: lint/typecheck pass; tests when applicable                                   |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.20: AI Module (Claude API)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.19 completed
- **Task Estimate**: 17h

| Subtask ID | Work item                                                          | Owner        | Estimate | Dependency | Acceptance                                                                                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.20.1     | ai.service.ts - Claude API integration                             | Backend Lead | 6h       | 2.19.3     | Target outcome: ai.service.ts - Claude API integration; verification: lint/typecheck pass; tests when applicable                             |
| 2.20.2     | Student insight generation (motivational advice, study strategies) | Backend Lead | 2h       | 2.20.1     | Target outcome: Student insight generation (motivational advice, study strategies); verification: lint/typecheck pass; tests when applicable |
| 2.20.3     | Report generation (admin-level AI reports)                         | Backend Lead | 2h       | 2.20.2     | Target outcome: Report generation (admin-level AI reports); verification: lint/typecheck pass; tests when applicable                         |
| 2.20.4     | Chat endpoint (stream response)                                    | Backend Lead | 2h       | 2.20.3     | Target outcome: Chat endpoint (stream response); verification: lint/typecheck pass; tests when applicable                                    |
| 2.20.5     | Token usage tracking                                               | Backend Lead | 2h       | 2.20.4     | Target outcome: Token usage tracking; verification: lint/typecheck pass; tests when applicable                                               |
| 2.20.6     | DTOs: chat, report                                                 | Backend Lead | 3h       | 2.20.5     | Target outcome: DTOs: chat, report; verification: lint/typecheck pass; tests when applicable                                                 |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.21: Email Module (Resend)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.20 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                                |
| ---------- | --------------------------------------------------------------- | ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2.21.1     | email.service.ts - Resend API integration                       | Backend Lead | 6h       | 2.20.6     | Target outcome: email.service.ts - Resend API integration; verification: lint/typecheck pass; tests when applicable                       |
| 2.21.2     | Email templates: welcome, password-reset, invoice, notification | Backend Lead | 3h       | 2.21.1     | Target outcome: Email templates: welcome, password-reset, invoice, notification; verification: lint/typecheck pass; tests when applicable |
| 2.21.3     | BullMQ email processor                                          | Backend Lead | 2h       | 2.21.2     | Target outcome: BullMQ email processor; verification: lint/typecheck pass; tests when applicable                                          |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.22: SMS Module (Twilio)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.21 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                     | Owner        | Estimate | Dependency | Acceptance                                                                                                              |
| ---------- | --------------------------------------------- | ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2.22.1     | sms.service.ts - Twilio integration           | Backend Lead | 6h       | 2.21.3     | Target outcome: sms.service.ts - Twilio integration; verification: lint/typecheck pass; tests when applicable           |
| 2.22.2     | SMS templates (attendance alert, grade alert) | Backend Lead | 3h       | 2.22.1     | Target outcome: SMS templates (attendance alert, grade alert); verification: lint/typecheck pass; tests when applicable |
| 2.22.3     | BullMQ SMS processor                          | Backend Lead | 2h       | 2.22.2     | Target outcome: BullMQ SMS processor; verification: lint/typecheck pass; tests when applicable                          |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.23: Queue Module (BullMQ)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.22 completed
- **Task Estimate**: 10h

| Subtask ID | Work item                                | Owner        | Estimate | Dependency | Acceptance                                                                                                         |
| ---------- | ---------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| 2.23.1     | queue.module.ts - BullMQ + Redis setup   | Backend Lead | 4h       | 2.22.3     | Target outcome: queue.module.ts - BullMQ + Redis setup; verification: lint/typecheck pass; tests when applicable   |
| 2.23.2     | Email processor, SMS processor           | Backend Lead | 2h       | 2.23.1     | Target outcome: Email processor, SMS processor; verification: lint/typecheck pass; tests when applicable           |
| 2.23.3     | Notification processor                   | Backend Lead | 2h       | 2.23.2     | Target outcome: Notification processor; verification: lint/typecheck pass; tests when applicable                   |
| 2.23.4     | Report generation processor (AI reports) | Backend Lead | 2h       | 2.23.3     | Target outcome: Report generation processor (AI reports); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.24: Cache Module (Self-hosted Redis via WireGuard)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.23 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                     | Owner        | Estimate | Dependency | Acceptance                                                                                                              |
| ---------- | --------------------------------------------- | ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2.24.1     | cache.module.ts + cache.service.ts            | Backend Lead | 4h       | 2.23.4     | Target outcome: cache.module.ts + cache.service.ts; verification: lint/typecheck pass; tests when applicable            |
| 2.24.2     | Cache strategies (TTL, invalidation)          | Backend Lead | 4h       | 2.24.1     | Target outcome: Cache strategies (TTL, invalidation); verification: lint/typecheck pass; tests when applicable          |
| 2.24.3     | Cached endpoints (dashboard stats, schedules) | Backend Lead | 4h       | 2.24.2     | Target outcome: Cached endpoints (dashboard stats, schedules); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.25: Audit Module

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.24 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.25.1     | audit.service.ts - log all CRUD operations      | Backend Lead | 4h       | 2.24.3     | Target outcome: audit.service.ts - log all CRUD operations; verification: lint/typecheck pass; tests when applicable      |
| 2.25.2     | audit.interceptor.ts - auto-log via interceptor | Backend Lead | 3h       | 2.25.1     | Target outcome: audit.interceptor.ts - auto-log via interceptor; verification: lint/typecheck pass; tests when applicable |
| 2.25.3     | Audit log query endpoint (admin only)           | Backend Lead | 2h       | 2.25.2     | Target outcome: Audit log query endpoint (admin only); verification: lint/typecheck pass; tests when applicable           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 2.26: tRPC Integration

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 2.25 completed
- **Task Estimate**: 19h
- **Execution note**: To avoid late integration risk, start contract skeleton (`2.26.1`/`2.26.2`) immediately after tenant/auth modules are stable, while keeping final merge and completion in this task block.

| Subtask ID | Work item                                       | Owner        | Estimate | Dependency | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.26.1     | `packages/trpc` - tRPC init, context, routers   | Backend Lead | 3h       | 2.25.3     | Target outcome: `packages/trpc` - tRPC init, context, routers; verification: lint/typecheck pass; tests when applicable   |
| 2.26.2     | Auth router, tenant router, teacher router      | Backend Lead | 4h       | 2.26.1     | Target outcome: Auth router, tenant router, teacher router; verification: lint/typecheck pass; tests when applicable      |
| 2.26.3     | Student router, attendance router, grade router | Backend Lead | 3h       | 2.26.2     | Target outcome: Student router, attendance router, grade router; verification: lint/typecheck pass; tests when applicable |
| 2.26.4     | Exam router, assignment router, finance router  | Backend Lead | 3h       | 2.26.3     | Target outcome: Exam router, assignment router, finance router; verification: lint/typecheck pass; tests when applicable  |
| 2.26.5     | Notification router, schedule router, AI router | Backend Lead | 3h       | 2.26.4     | Target outcome: Notification router, schedule router, AI router; verification: lint/typecheck pass; tests when applicable |
| 2.26.6     | App router merge (all routers combined)         | Backend Lead | 3h       | 2.26.5     | Target outcome: App router merge (all routers combined); verification: lint/typecheck pass; tests when applicable         |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 2 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 3: NEXT.JS FRONTEND - SHARED INFRA

**Maqsad**: Web app asosiy tuzilmasini yaratish
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 2 exit gate

### Task 3.1: Next.js Project Setup

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 3 entry gate
- **Task Estimate**: 15h

| Subtask ID | Work item                                                                         | Owner         | Estimate | Dependency        | Acceptance                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------- | ------------- | -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1.1      | `apps/web` init (Next.js 16, App Router)                                          | Frontend Lead | 3h       | FAZA 3 entry gate | Target outcome: `apps/web` init (Next.js 16, App Router); verification: lint/typecheck pass; tests when applicable                                       |
| 3.1.2      | next.config.ts (images, transpilePackages, experimental features)                 | Frontend Lead | 3h       | 3.1.1             | Target outcome: next.config.ts (images, transpilePackages, experimental features); verification: lint/typecheck pass; tests when applicable              |
| 3.1.3      | tailwind.config.ts (optional compatibility file for tooling/legacy plugins in v4) | Frontend Lead | 1h       | 3.1.2             | Optional: create tailwind.config.ts only if required by tooling/plugin integration; otherwise CSS-first setup is valid.                                  |
| 3.1.4      | globals.css (Tailwind v4 CSS-first: @import, @theme tokens, custom animations)    | Frontend Lead | 2h       | 3.1.2             | Target outcome: globals.css (Tailwind v4 CSS-first: @import, @theme tokens, custom animations); verification: lint/typecheck pass; tests when applicable |
| 3.1.5      | Root layout.tsx (fonts, providers, metadata)                                      | Frontend Lead | 4h       | 3.1.4             | Target outcome: Root layout.tsx (fonts, providers, metadata); verification: lint/typecheck pass; tests when applicable                                   |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.2: Proxy (Critical)

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.1 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                                                                                                                 | Owner         | Estimate | Dependency | Acceptance                                                                                                                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.2.1      | proxy.ts - subdomain detection (platform.talimy.space, [school].talimy.space)                                                             | Frontend Lead | 6h       | 3.1.5      | Target outcome: proxy.ts - subdomain detection (platform.talimy.space, [school].talimy.space); verification: host matrix test (`platform`, valid school slug, bare domain)                                                                                    |
| 3.2.2      | Lightweight auth gate skeleton in proxy (public/private redirect only; no heavy authorization logic, final provider integration in 7.1.7) | Frontend Lead | 4h       | 3.2.1      | Target outcome: Lightweight auth gate skeleton in proxy (public/private redirect only; no heavy authorization logic, final provider integration in 7.1.7); verification: unauthenticated redirect checks for protected prefixes with placeholder auth context |
| 3.2.3      | Role-route normalization hints in proxy; final authorization enforced in server guards/handlers                                           | Frontend Lead | 2h       | 3.2.2      | Target outcome: Role-route normalization hints in proxy; final authorization enforced in server guards/handlers; verification: role mismatch attempts blocked by server-side auth                                                                             |
| 3.2.4      | i18n locale detection (next-intl) with safe exclusions for assets/API routes                                                              | Frontend Lead | 3h       | 3.2.3      | Target outcome: i18n locale detection (next-intl) with safe exclusions for assets/API routes; verification: locale redirect tests + static/API bypass checks                                                                                                  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.3: Providers Setup

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.2 completed
- **Task Estimate**: 20h

| Subtask ID | Work item                                    | Owner         | Estimate | Dependency | Acceptance                                                                                                             |
| ---------- | -------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| 3.3.1      | auth-provider.tsx (NextAuth SessionProvider) | Frontend Lead | 4h       | 3.2.4      | Target outcome: auth-provider.tsx (NextAuth SessionProvider); verification: lint/typecheck pass; tests when applicable |
| 3.3.2      | query-provider.tsx (TanStack Query)          | Frontend Lead | 4h       | 3.3.1      | Target outcome: query-provider.tsx (TanStack Query); verification: lint/typecheck pass; tests when applicable          |
| 3.3.3      | theme-provider.tsx (light/dark mode)         | Frontend Lead | 4h       | 3.3.2      | Target outcome: theme-provider.tsx (light/dark mode); verification: lint/typecheck pass; tests when applicable         |
| 3.3.4      | intl-provider.tsx (next-intl)                | Frontend Lead | 4h       | 3.3.3      | Target outcome: intl-provider.tsx (next-intl); verification: lint/typecheck pass; tests when applicable                |
| 3.3.5      | socket-provider.tsx (Socket.IO client)       | Frontend Lead | 4h       | 3.3.4      | Target outcome: socket-provider.tsx (Socket.IO client); verification: lint/typecheck pass; tests when applicable       |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.4: Zustand Stores

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.3 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                                         |
| ---------- | -------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 3.4.1      | auth-store.ts (user, tenant, permissions)                | Frontend Lead | 4h       | 3.3.5      | Target outcome: auth-store.ts (user, tenant, permissions); verification: lint/typecheck pass; tests when applicable                |
| 3.4.2      | sidebar-store.ts (collapsed/expanded, active item)       | Frontend Lead | 3h       | 3.4.1      | Target outcome: sidebar-store.ts (collapsed/expanded, active item); verification: lint/typecheck pass; tests when applicable       |
| 3.4.3      | notification-store.ts (unread count, notifications list) | Frontend Lead | 3h       | 3.4.2      | Target outcome: notification-store.ts (unread count, notifications list); verification: lint/typecheck pass; tests when applicable |
| 3.4.4      | theme-store.ts (theme mode)                              | Frontend Lead | 3h       | 3.4.3      | Target outcome: theme-store.ts (theme mode); verification: lint/typecheck pass; tests when applicable                              |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.5: API Client Setup

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.4 completed
- **Task Estimate**: 14h

| Subtask ID | Work item                                             | Owner         | Estimate | Dependency | Acceptance                                                                                                                      |
| ---------- | ----------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 3.5.1      | lib/trpc/client.ts - tRPC client init                 | Frontend Lead | 2h       | 3.4.4      | Target outcome: lib/trpc/client.ts - tRPC client init; verification: lint/typecheck pass; tests when applicable                 |
| 3.5.2      | lib/trpc/server.ts - tRPC server caller               | Frontend Lead | 2h       | 3.5.1      | Target outcome: lib/trpc/server.ts - tRPC server caller; verification: lint/typecheck pass; tests when applicable               |
| 3.5.3      | lib/trpc/provider.tsx - tRPC provider wrapper         | Frontend Lead | 4h       | 3.5.2      | Target outcome: lib/trpc/provider.tsx - tRPC provider wrapper; verification: lint/typecheck pass; tests when applicable         |
| 3.5.4      | lib/api.ts - REST API client (fallback, file uploads) | Frontend Lead | 2h       | 3.5.3      | Target outcome: lib/api.ts - REST API client (fallback, file uploads); verification: lint/typecheck pass; tests when applicable |
| 3.5.5      | lib/socket.ts - Socket.IO client init                 | Frontend Lead | 4h       | 3.5.4      | Target outcome: lib/socket.ts - Socket.IO client init; verification: lint/typecheck pass; tests when applicable                 |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.6: Custom Hooks

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.5 completed
- **Task Estimate**: 18h

| Subtask ID | Work item                                          | Owner         | Estimate | Dependency | Acceptance                                                                                                                   |
| ---------- | -------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 3.6.1      | use-auth.ts (session, user, role, permissions)     | Frontend Lead | 4h       | 3.5.5      | Target outcome: use-auth.ts (session, user, role, permissions); verification: lint/typecheck pass; tests when applicable     |
| 3.6.2      | use-tenant.ts (current tenant info)                | Frontend Lead | 2h       | 3.6.1      | Target outcome: use-tenant.ts (current tenant info); verification: lint/typecheck pass; tests when applicable                |
| 3.6.3      | use-permissions.ts (can(), hasRole(), genderScope) | Frontend Lead | 2h       | 3.6.2      | Target outcome: use-permissions.ts (can(), hasRole(), genderScope); verification: lint/typecheck pass; tests when applicable |
| 3.6.4      | use-socket.ts (socket connection, events)          | Frontend Lead | 4h       | 3.6.3      | Target outcome: use-socket.ts (socket connection, events); verification: lint/typecheck pass; tests when applicable          |
| 3.6.5      | use-notifications.ts (real-time notifications)     | Frontend Lead | 4h       | 3.6.4      | Target outcome: use-notifications.ts (real-time notifications); verification: lint/typecheck pass; tests when applicable     |
| 3.6.6      | use-sidebar.ts (sidebar state)                     | Frontend Lead | 2h       | 3.6.5      | Target outcome: use-sidebar.ts (sidebar state); verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.7: Navigation Config

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.6 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                      | Owner         | Estimate | Dependency | Acceptance                                                                                                               |
| ---------- | ---------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 3.7.1      | platform-nav.ts (Platform Admin sidebar items) | Frontend Lead | 3h       | 3.6.6      | Target outcome: platform-nav.ts (Platform Admin sidebar items); verification: lint/typecheck pass; tests when applicable |
| 3.7.2      | admin-nav.ts (School Admin sidebar items)      | Frontend Lead | 2h       | 3.7.1      | Target outcome: admin-nav.ts (School Admin sidebar items); verification: lint/typecheck pass; tests when applicable      |
| 3.7.3      | teacher-nav.ts (Teacher sidebar items)         | Frontend Lead | 2h       | 3.7.2      | Target outcome: teacher-nav.ts (Teacher sidebar items); verification: lint/typecheck pass; tests when applicable         |
| 3.7.4      | student-nav.ts (Student sidebar items)         | Frontend Lead | 2h       | 3.7.3      | Target outcome: student-nav.ts (Student sidebar items); verification: lint/typecheck pass; tests when applicable         |
| 3.7.5      | parent-nav.ts (Parent sidebar items)           | Frontend Lead | 2h       | 3.7.4      | Target outcome: parent-nav.ts (Parent sidebar items); verification: lint/typecheck pass; tests when applicable           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 3.8: i18n Setup

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 3.7 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                              |
| ---------- | --------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 3.8.1      | next-intl configuration                       | Frontend Lead | 3h       | 3.7.5      | Target outcome: next-intl configuration; verification: lint/typecheck pass; tests when applicable                       |
| 3.8.2      | uz.json - O'zbek tili tarjimalari (200+ keys) | Frontend Lead | 2h       | 3.8.1      | Target outcome: uz.json - O'zbek tili tarjimalari (200+ keys); verification: lint/typecheck pass; tests when applicable |
| 3.8.3      | tr.json - Turk tili tarjimalari               | Frontend Lead | 2h       | 3.8.2      | Target outcome: tr.json - Turk tili tarjimalari; verification: lint/typecheck pass; tests when applicable               |
| 3.8.4      | en.json - Ingliz tili tarjimalari             | Frontend Lead | 2h       | 3.8.3      | Target outcome: en.json - Ingliz tili tarjimalari; verification: lint/typecheck pass; tests when applicable             |
| 3.8.5      | ru.json - Rus tili tarjimalari                | Frontend Lead | 2h       | 3.8.4      | Target outcome: ru.json - Rus tili tarjimalari; verification: lint/typecheck pass; tests when applicable                |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 3 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 4: UI KOMPONENTLAR KUTUBXONASI

**Maqsad**: Shared UI package yaratish
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 3 exit gate

### Task 4.1: shadcn/ui Primitives (packages/ui)

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 4 entry gate
- **Task Estimate**: 15h

| Subtask ID | Work item                                                                        | Owner         | Estimate | Dependency        | Acceptance                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------- | ------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1.1      | shadcn/ui init (button, input, label, select, checkbox, radio, switch, textarea) | Frontend Lead | 2h       | FAZA 4 entry gate | Target outcome: shadcn/ui init (button, input, label, select, checkbox, radio, switch, textarea); verification: lint/typecheck pass; tests when applicable |
| 4.1.2      | Dialog, alert-dialog, dropdown-menu, popover, tooltip                            | Frontend Lead | 2h       | 4.1.1             | Target outcome: Dialog, alert-dialog, dropdown-menu, popover, tooltip; verification: lint/typecheck pass; tests when applicable                            |
| 4.1.3      | Tabs, card, badge, avatar, separator, skeleton                                   | Frontend Lead | 2h       | 4.1.2             | Target outcome: Tabs, card, badge, avatar, separator, skeleton; verification: lint/typecheck pass; tests when applicable                                   |
| 4.1.4      | Sheet, scroll-area, command, calendar, table                                     | Frontend Lead | 3h       | 4.1.3             | Target outcome: Sheet, scroll-area, command, calendar, table; verification: lint/typecheck pass; tests when applicable                                     |
| 4.1.5      | Form, toast (Sileo), progress, slider, accordion                                 | Frontend Lead | 3h       | 4.1.4             | Target outcome: Form, toast (Sileo), progress, slider, accordion; verification: lint/typecheck pass; tests when applicable                                 |
| 4.1.6      | Breadcrumb, pagination, chart (Recharts wrapper)                                 | Frontend Lead | 3h       | 4.1.5             | Target outcome: Breadcrumb, pagination, chart (Recharts wrapper); verification: lint/typecheck pass; tests when applicable                                 |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 4.2: Data Table Component

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 4.1 completed
- **Task Estimate**: 21h

| Subtask ID | Work item                                              | Owner         | Estimate | Dependency | Acceptance                                                                                                                       |
| ---------- | ------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 4.2.1      | data-table.tsx (TanStack Table + shadcn wrapper)       | Frontend Lead | 3h       | 4.1.6      | Target outcome: data-table.tsx (TanStack Table + shadcn wrapper); verification: lint/typecheck pass; tests when applicable       |
| 4.2.2      | data-table-toolbar.tsx (search, filters, view options) | Frontend Lead | 3h       | 4.2.1      | Target outcome: data-table-toolbar.tsx (search, filters, view options); verification: lint/typecheck pass; tests when applicable |
| 4.2.3      | data-table-pagination.tsx                              | Frontend Lead | 3h       | 4.2.2      | Target outcome: data-table-pagination.tsx; verification: lint/typecheck pass; tests when applicable                              |
| 4.2.4      | data-table-column-header.tsx (sortable columns)        | Frontend Lead | 3h       | 4.2.3      | Target outcome: data-table-column-header.tsx (sortable columns); verification: lint/typecheck pass; tests when applicable        |
| 4.2.5      | data-table-faceted-filter.tsx                          | Frontend Lead | 3h       | 4.2.4      | Target outcome: data-table-faceted-filter.tsx; verification: lint/typecheck pass; tests when applicable                          |
| 4.2.6      | data-table-view-options.tsx (column visibility)        | Frontend Lead | 3h       | 4.2.5      | Target outcome: data-table-view-options.tsx (column visibility); verification: lint/typecheck pass; tests when applicable        |
| 4.2.7      | data-table-row-actions.tsx (edit, delete, view)        | Frontend Lead | 3h       | 4.2.6      | Target outcome: data-table-row-actions.tsx (edit, delete, view); verification: lint/typecheck pass; tests when applicable        |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 4.3: Custom Components

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 4.2 completed
- **Task Estimate**: 33h

| Subtask ID | Work item                                            | Owner         | Estimate | Dependency | Acceptance                                                                                                                     |
| ---------- | ---------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 4.3.1      | stat-card.tsx (icon, title, value, trend, sparkline) | Frontend Lead | 2h       | 4.2.7      | Target outcome: stat-card.tsx (icon, title, value, trend, sparkline); verification: lint/typecheck pass; tests when applicable |
| 4.3.2      | kpi-card.tsx (big number + comparison)               | Frontend Lead | 2h       | 4.3.1      | Target outcome: kpi-card.tsx (big number + comparison); verification: lint/typecheck pass; tests when applicable               |
| 4.3.3      | mini-chart.tsx (inline sparkline chart)              | Frontend Lead | 3h       | 4.3.2      | Target outcome: mini-chart.tsx (inline sparkline chart); verification: lint/typecheck pass; tests when applicable              |
| 4.3.4      | empty-state.tsx (icon, title, description, action)   | Frontend Lead | 2h       | 4.3.3      | Target outcome: empty-state.tsx (icon, title, description, action); verification: lint/typecheck pass; tests when applicable   |
| 4.3.5      | error-boundary.tsx (React error boundary)            | Frontend Lead | 2h       | 4.3.4      | Target outcome: error-boundary.tsx (React error boundary); verification: lint/typecheck pass; tests when applicable            |
| 4.3.6      | loading-skeleton.tsx (page/card/table skeletons)     | Frontend Lead | 3h       | 4.3.5      | Target outcome: loading-skeleton.tsx (page/card/table skeletons); verification: lint/typecheck pass; tests when applicable     |
| 4.3.7      | confirm-dialog.tsx (action confirmation)             | Frontend Lead | 2h       | 4.3.6      | Target outcome: confirm-dialog.tsx (action confirmation); verification: lint/typecheck pass; tests when applicable             |
| 4.3.8      | file-upload.tsx (drag-drop, preview, R2 upload)      | Frontend Lead | 2h       | 4.3.7      | Target outcome: file-upload.tsx (drag-drop, preview, R2 upload); verification: lint/typecheck pass; tests when applicable      |
| 4.3.9      | phone-input.tsx (international phone input)          | Frontend Lead | 2h       | 4.3.8      | Target outcome: phone-input.tsx (international phone input); verification: lint/typecheck pass; tests when applicable          |
| 4.3.10     | searchable-select.tsx (async search, multi-select)   | Frontend Lead | 2h       | 4.3.9      | Target outcome: searchable-select.tsx (async search, multi-select); verification: lint/typecheck pass; tests when applicable   |
| 4.3.11     | date-picker.tsx (single, range)                      | Frontend Lead | 2h       | 4.3.10     | Target outcome: date-picker.tsx (single, range); verification: lint/typecheck pass; tests when applicable                      |
| 4.3.12     | time-picker.tsx                                      | Frontend Lead | 2h       | 4.3.11     | Target outcome: time-picker.tsx; verification: lint/typecheck pass; tests when applicable                                      |
| 4.3.13     | stepper-form.tsx (multi-step form with validation)   | Frontend Lead | 3h       | 4.3.12     | Target outcome: stepper-form.tsx (multi-step form with validation); verification: lint/typecheck pass; tests when applicable   |
| 4.3.14     | gender-select.tsx                                    | Frontend Lead | 2h       | 4.3.13     | Target outcome: gender-select.tsx; verification: lint/typecheck pass; tests when applicable                                    |
| 4.3.15     | command-palette.tsx (Cmd+K global search)            | Frontend Lead | 2h       | 4.3.14     | Target outcome: command-palette.tsx (Cmd+K global search); verification: lint/typecheck pass; tests when applicable            |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 4 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 5: LAYOUT KOMPONENTLARI

**Maqsad**: App shell, sidebar, header tuzilmasini yaratish
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 4 exit gate

### Task 5.1: App Shell

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 5 entry gate
- **Task Estimate**: 5h

| Subtask ID | Work item                                                           | Owner         | Estimate | Dependency        | Acceptance                                                                                                                                    |
| ---------- | ------------------------------------------------------------------- | ------------- | -------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1.1      | app-shell.tsx (sidebar + header + main content area)                | Frontend Lead | 2h       | FAZA 5 entry gate | Target outcome: app-shell.tsx (sidebar + header + main content area); verification: lint/typecheck pass; tests when applicable                |
| 5.1.2      | Responsive behavior (mobile drawer, tablet collapsed, desktop full) | Frontend Lead | 3h       | 5.1.1             | Target outcome: Responsive behavior (mobile drawer, tablet collapsed, desktop full); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 5.2: Sidebar

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 5.1 completed
- **Task Estimate**: 10h

| Subtask ID | Work item                                                          | Owner         | Estimate | Dependency | Acceptance                                                                                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.2.1      | sidebar.tsx (280px expanded, 72px collapsed)                       | Frontend Lead | 2h       | 5.1.2      | Target outcome: sidebar.tsx (280px expanded, 72px collapsed); verification: lint/typecheck pass; tests when applicable                       |
| 5.2.2      | sidebar-logo.tsx (logo + app name)                                 | Frontend Lead | 2h       | 5.2.1      | Target outcome: sidebar-logo.tsx (logo + app name); verification: lint/typecheck pass; tests when applicable                                 |
| 5.2.3      | sidebar-nav.tsx (nav items with icons, active state, nested items) | Frontend Lead | 2h       | 5.2.2      | Target outcome: sidebar-nav.tsx (nav items with icons, active state, nested items); verification: lint/typecheck pass; tests when applicable |
| 5.2.4      | sidebar-user.tsx (avatar, name, role, logout)                      | Frontend Lead | 2h       | 5.2.3      | Target outcome: sidebar-user.tsx (avatar, name, role, logout); verification: lint/typecheck pass; tests when applicable                      |
| 5.2.5      | sidebar-mobile.tsx (drawer variant for mobile)                     | Frontend Lead | 2h       | 5.2.4      | Target outcome: sidebar-mobile.tsx (drawer variant for mobile); verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 5.3: Header

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 5.2 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                                         | Owner         | Estimate | Dependency | Acceptance                                                                                                                                  |
| ---------- | ----------------------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.3.1      | header.tsx (search, notifications, user menu)                     | Frontend Lead | 2h       | 5.2.5      | Target outcome: header.tsx (search, notifications, user menu); verification: lint/typecheck pass; tests when applicable                     |
| 5.3.2      | header-search.tsx (global search trigger -> Cmd+K)                | Frontend Lead | 2h       | 5.3.1      | Target outcome: header-search.tsx (global search trigger -> Cmd+K); verification: lint/typecheck pass; tests when applicable                |
| 5.3.3      | header-notifications.tsx (bell icon + dropdown + real-time count) | Frontend Lead | 4h       | 5.3.2      | Target outcome: header-notifications.tsx (bell icon + dropdown + real-time count); verification: lint/typecheck pass; tests when applicable |
| 5.3.4      | header-user-menu.tsx (avatar, profile, settings, logout)          | Frontend Lead | 2h       | 5.3.3      | Target outcome: header-user-menu.tsx (avatar, profile, settings, logout); verification: lint/typecheck pass; tests when applicable          |
| 5.3.5      | header-language-switcher.tsx (uz/tr/en/ru)                        | Frontend Lead | 2h       | 5.3.4      | Target outcome: header-language-switcher.tsx (uz/tr/en/ru); verification: lint/typecheck pass; tests when applicable                        |
| 5.3.6      | breadcrumb-nav.tsx (auto-generated from route)                    | Frontend Lead | 3h       | 5.3.5      | Target outcome: breadcrumb-nav.tsx (auto-generated from route); verification: lint/typecheck pass; tests when applicable                    |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 5 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 6: PUBLIC (MARKETING) SAHIFALAR

**Maqsad**: talimy.space landing va public pages
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 5 exit gate

### Task 6.1: Marketing Layout

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 6 entry gate
- **Task Estimate**: 8h

| Subtask ID | Work item                                                 | Owner         | Estimate | Dependency        | Acceptance                                                                                                                          |
| ---------- | --------------------------------------------------------- | ------------- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 6.1.1      | layout.tsx (navbar + footer wrapper)                      | Frontend Lead | 4h       | FAZA 6 entry gate | Target outcome: layout.tsx (navbar + footer wrapper); verification: lint/typecheck pass; tests when applicable                      |
| 6.1.2      | navbar.tsx (logo, links, login button, language switcher) | Frontend Lead | 2h       | 6.1.1             | Target outcome: navbar.tsx (logo, links, login button, language switcher); verification: lint/typecheck pass; tests when applicable |
| 6.1.3      | footer.tsx (links, social, copyright)                     | Frontend Lead | 2h       | 6.1.2             | Target outcome: footer.tsx (links, social, copyright); verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 6.2: Landing Page

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 6.1 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                          | Owner         | Estimate | Dependency | Acceptance                                                                                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.2.1      | hero-section.tsx (headline, subtext, CTA, illustration)            | Frontend Lead | 2h       | 6.1.3      | Target outcome: hero-section.tsx (headline, subtext, CTA, illustration); verification: lint/typecheck pass; tests when applicable            |
| 6.2.2      | features-section.tsx (icon cards: attendance, grades, finance, AI) | Frontend Lead | 2h       | 6.2.1      | Target outcome: features-section.tsx (icon cards: attendance, grades, finance, AI); verification: lint/typecheck pass; tests when applicable |
| 6.2.3      | pricing-section.tsx (plan cards: Free, Basic, Pro, Enterprise)     | Frontend Lead | 2h       | 6.2.2      | Target outcome: pricing-section.tsx (plan cards: Free, Basic, Pro, Enterprise); verification: lint/typecheck pass; tests when applicable     |
| 6.2.4      | testimonials-section.tsx (maktab direktorlari fikriari)            | Frontend Lead | 2h       | 6.2.3      | Target outcome: testimonials-section.tsx (maktab direktorlari fikriari); verification: lint/typecheck pass; tests when applicable            |
| 6.2.5      | cta-section.tsx (final call to action)                             | Frontend Lead | 2h       | 6.2.4      | Target outcome: cta-section.tsx (final call to action); verification: lint/typecheck pass; tests when applicable                             |
| 6.2.6      | SEO: meta tags, JSON-LD, Open Graph                                | Frontend Lead | 2h       | 6.2.5      | Target outcome: SEO: meta tags, JSON-LD, Open Graph; verification: lint/typecheck pass; tests when applicable                                |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 6.3: Other Public Pages

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 6.2 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                      | Owner         | Estimate | Dependency | Acceptance                                                                                                               |
| ---------- | ---------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 6.3.1      | pricing/page.tsx (detailed pricing comparison) | Frontend Lead | 3h       | 6.2.6      | Target outcome: pricing/page.tsx (detailed pricing comparison); verification: lint/typecheck pass; tests when applicable |
| 6.3.2      | about/page.tsx                                 | Frontend Lead | 3h       | 6.3.1      | Target outcome: about/page.tsx; verification: lint/typecheck pass; tests when applicable                                 |
| 6.3.3      | contact/page.tsx (form + map)                  | Frontend Lead | 3h       | 6.3.2      | Target outcome: contact/page.tsx (form + map); verification: lint/typecheck pass; tests when applicable                  |
| 6.3.4      | features/page.tsx (detailed features)          | Frontend Lead | 3h       | 6.3.3      | Target outcome: features/page.tsx (detailed features); verification: lint/typecheck pass; tests when applicable          |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 6 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 7: AUTH SAHIFALAR

**Maqsad**: Authentication flows
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 6 exit gate

### Task 7.1: Auth Pages

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 7 entry gate
- **Task Estimate**: 27h

| Subtask ID | Work item                                                      | Owner         | Estimate | Dependency        | Acceptance                                                                                                                               |
| ---------- | -------------------------------------------------------------- | ------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1.1      | Auth layout (centered card, gradient background, logo)         | Frontend Lead | 4h       | FAZA 7 entry gate | Target outcome: Auth layout (centered card, gradient background, logo); verification: lint/typecheck pass; tests when applicable         |
| 7.1.2      | Login page (email/phone + password, social login, remember me) | Frontend Lead | 3h       | 7.1.1             | Target outcome: Login page (email/phone + password, social login, remember me); verification: lint/typecheck pass; tests when applicable |
| 7.1.3      | Register page (school registration multi-step)                 | Frontend Lead | 3h       | 7.1.2             | Target outcome: Register page (school registration multi-step); verification: lint/typecheck pass; tests when applicable                 |
| 7.1.4      | Forgot password page (email/phone input)                       | Frontend Lead | 3h       | 7.1.3             | Target outcome: Forgot password page (email/phone input); verification: lint/typecheck pass; tests when applicable                       |
| 7.1.5      | Reset password page (new password + confirm)                   | Frontend Lead | 3h       | 7.1.4             | Target outcome: Reset password page (new password + confirm); verification: lint/typecheck pass; tests when applicable                   |
| 7.1.6      | Verify email page                                              | Frontend Lead | 3h       | 7.1.5             | Target outcome: Verify email page; verification: lint/typecheck pass; tests when applicable                                              |
| 7.1.7      | NextAuth config (credentials provider, JWT, session callbacks) | Frontend Lead | 4h       | 7.1.6             | Target outcome: NextAuth config (credentials provider, JWT, session callbacks); verification: lint/typecheck pass; tests when applicable |
| 7.1.8      | API routes: [...nextauth]/route.ts                             | Frontend Lead | 4h       | 7.1.7             | Target outcome: API routes: [...nextauth]/route.ts; verification: lint/typecheck pass; tests when applicable                             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 7 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 8: PLATFORM ADMIN PANEL

**Maqsad**: platform.talimy.space - Super Admin
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 7 exit gate

### Task 8.1: Platform Layout

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 8 entry gate
- **Task Estimate**: 7h

| Subtask ID | Work item                                       | Owner         | Estimate | Dependency        | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8.1.1      | Platform sidebar layout (platform-specific nav) | Frontend Lead | 4h       | FAZA 8 entry gate | Target outcome: Platform sidebar layout (platform-specific nav); verification: lint/typecheck pass; tests when applicable |
| 8.1.2      | Platform header (admin badge, global search)    | Frontend Lead | 3h       | 8.1.1             | Target outcome: Platform header (admin badge, global search); verification: lint/typecheck pass; tests when applicable    |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 8.2: Platform Dashboard

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 8.1 completed
- **Task Estimate**: 16h

| Subtask ID | Work item                                              | Owner         | Estimate | Dependency | Acceptance                                                                                                                       |
| ---------- | ------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 8.2.1      | KPI cards (total schools, students, teachers, revenue) | Frontend Lead | 2h       | 8.1.2      | Target outcome: KPI cards (total schools, students, teachers, revenue); verification: lint/typecheck pass; tests when applicable |
| 8.2.2      | Schools overview chart (bar chart - schools by region) | Frontend Lead | 3h       | 8.2.1      | Target outcome: Schools overview chart (bar chart - schools by region); verification: lint/typecheck pass; tests when applicable |
| 8.2.3      | Revenue chart (line chart - monthly revenue)           | Frontend Lead | 3h       | 8.2.2      | Target outcome: Revenue chart (line chart - monthly revenue); verification: lint/typecheck pass; tests when applicable           |
| 8.2.4      | Growth chart (area chart - student/school growth)      | Frontend Lead | 3h       | 8.2.3      | Target outcome: Growth chart (area chart - student/school growth); verification: lint/typecheck pass; tests when applicable      |
| 8.2.5      | Recent schools table (last 10 registered)              | Frontend Lead | 3h       | 8.2.4      | Target outcome: Recent schools table (last 10 registered); verification: lint/typecheck pass; tests when applicable              |
| 8.2.6      | System health indicators                               | Frontend Lead | 2h       | 8.2.5      | Target outcome: System health indicators; verification: lint/typecheck pass; tests when applicable                               |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 8.3: Platform Dashboard Sub-pages

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 8.2 completed
- **Task Estimate**: 6h

| Subtask ID | Work item                                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                                              |
| ---------- | ------------------------------------------------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 8.3.1      | Revenue analytics page (detailed financial charts, filters)   | Frontend Lead | 3h       | 8.2.6      | Target outcome: Revenue analytics page (detailed financial charts, filters); verification: lint/typecheck pass; tests when applicable   |
| 8.3.2      | Growth analytics page (user growth, school growth, retention) | Frontend Lead | 3h       | 8.3.1      | Target outcome: Growth analytics page (user growth, school growth, retention); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 8.4: Schools Management

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 8.3 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                  | Owner         | Estimate | Dependency | Acceptance                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.4.1      | Schools list page (DataTable: name, slug, plan, students, status, actions) | Frontend Lead | 3h       | 8.3.2      | Target outcome: Schools list page (DataTable: name, slug, plan, students, status, actions); verification: lint/typecheck pass; tests when applicable |
| 8.4.2      | Add school page (form: name, slug, admin email, plan, gender policy)       | Frontend Lead | 3h       | 8.4.1      | Target outcome: Add school page (form: name, slug, admin email, plan, gender policy); verification: lint/typecheck pass; tests when applicable       |
| 8.4.3      | School detail page (stats, admin info, billing info, activity log)         | Frontend Lead | 3h       | 8.4.2      | Target outcome: School detail page (stats, admin info, billing info, activity log); verification: lint/typecheck pass; tests when applicable         |
| 8.4.4      | Edit school page                                                           | Frontend Lead | 3h       | 8.4.3      | Target outcome: Edit school page; verification: lint/typecheck pass; tests when applicable                                                           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 8.5: Platform Settings

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 8.4 completed
- **Task Estimate**: 16h

| Subtask ID | Work item                                              | Owner         | Estimate | Dependency | Acceptance                                                                                                                       |
| ---------- | ------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 8.5.1      | General settings (platform name, logo, contact info)   | Frontend Lead | 3h       | 8.4.4      | Target outcome: General settings (platform name, logo, contact info); verification: lint/typecheck pass; tests when applicable   |
| 8.5.2      | Billing settings (tariff plans CRUD, payment methods)  | Frontend Lead | 4h       | 8.5.1      | Target outcome: Billing settings (tariff plans CRUD, payment methods); verification: lint/typecheck pass; tests when applicable  |
| 8.5.3      | Security settings (2FA, IP whitelist, session timeout) | Frontend Lead | 6h       | 8.5.2      | Target outcome: Security settings (2FA, IP whitelist, session timeout); verification: lint/typecheck pass; tests when applicable |
| 8.5.4      | Profile page (admin profile edit)                      | Frontend Lead | 3h       | 8.5.3      | Target outcome: Profile page (admin profile edit); verification: lint/typecheck pass; tests when applicable                      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 8 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 9: MAKTAB ADMIN PANEL

**Maqsad**: [school].talimy.space/admin - School Admin
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 8 exit gate

### Task 9.1: Admin Layout

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 9 entry gate
- **Task Estimate**: 6h

| Subtask ID | Work item                                       | Owner         | Estimate | Dependency        | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 9.1.1      | Admin sidebar layout (admin-specific nav items) | Frontend Lead | 4h       | FAZA 9 entry gate | Target outcome: Admin sidebar layout (admin-specific nav items); verification: lint/typecheck pass; tests when applicable |
| 9.1.2      | Admin header (school name, gender scope badge)  | Frontend Lead | 2h       | 9.1.1             | Target outcome: Admin header (school name, gender scope badge); verification: lint/typecheck pass; tests when applicable  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.2: Admin Dashboard

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.1 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                             | Owner         | Estimate | Dependency | Acceptance                                                                                                                                      |
| ---------- | --------------------------------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.2.1      | KPI cards (total students, teachers, attendance %, tuition collected) | Frontend Lead | 2h       | 9.1.2      | Target outcome: KPI cards (total students, teachers, attendance %, tuition collected); verification: lint/typecheck pass; tests when applicable |
| 9.2.2      | Attendance overview chart (daily/weekly)                              | Frontend Lead | 3h       | 9.2.1      | Target outcome: Attendance overview chart (daily/weekly); verification: lint/typecheck pass; tests when applicable                              |
| 9.2.3      | Recent activities feed                                                | Frontend Lead | 2h       | 9.2.2      | Target outcome: Recent activities feed; verification: lint/typecheck pass; tests when applicable                                                |
| 9.2.4      | Quick action cards (add student, mark attendance, create exam)        | Frontend Lead | 2h       | 9.2.3      | Target outcome: Quick action cards (add student, mark attendance, create exam); verification: lint/typecheck pass; tests when applicable        |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.3: Teachers Management

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.2 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                                                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.3.1      | Teachers list page (DataTable + gender filter)                                                | Frontend Lead | 3h       | 9.2.4      | Target outcome: Teachers list page (DataTable + gender filter); verification: lint/typecheck pass; tests when applicable                                                |
| 9.3.2      | Add teacher page (stepper: personal info -> qualifications -> subjects -> schedule -> review) | Frontend Lead | 3h       | 9.3.1      | Target outcome: Add teacher page (stepper: personal info -> qualifications -> subjects -> schedule -> review); verification: lint/typecheck pass; tests when applicable |
| 9.3.3      | Teacher profile page (info card, schedule, classes, performance)                              | Frontend Lead | 6h       | 9.3.2      | Target outcome: Teacher profile page (info card, schedule, classes, performance); verification: lint/typecheck pass; tests when applicable                              |
| 9.3.4      | Edit teacher page                                                                             | Frontend Lead | 3h       | 9.3.3      | Target outcome: Edit teacher page; verification: lint/typecheck pass; tests when applicable                                                                             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.4: Students Management

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.3 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9.4.1      | Students list page (DataTable + class/gender filter)                                     | Frontend Lead | 3h       | 9.3.4      | Target outcome: Students list page (DataTable + class/gender filter); verification: lint/typecheck pass; tests when applicable                                     |
| 9.4.2      | Add student page (stepper: personal info -> parent info -> class -> documents -> review) | Frontend Lead | 3h       | 9.4.1      | Target outcome: Add student page (stepper: personal info -> parent info -> class -> documents -> review); verification: lint/typecheck pass; tests when applicable |
| 9.4.3      | Student profile page (info, grades summary, attendance chart, assignments)               | Frontend Lead | 3h       | 9.4.2      | Target outcome: Student profile page (info, grades summary, attendance chart, assignments); verification: lint/typecheck pass; tests when applicable               |
| 9.4.4      | Edit student page                                                                        | Frontend Lead | 3h       | 9.4.3      | Target outcome: Edit student page; verification: lint/typecheck pass; tests when applicable                                                                        |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.5: Classes Management

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.4 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                            | Owner         | Estimate | Dependency | Acceptance                                                                                                                                     |
| ---------- | -------------------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.5.1      | Classes grid page (cards: class name, students count, teacher)       | Frontend Lead | 3h       | 9.4.4      | Target outcome: Classes grid page (cards: class name, students count, teacher); verification: lint/typecheck pass; tests when applicable       |
| 9.5.2      | Add class page (form: name, grade, section, capacity, academic year) | Frontend Lead | 3h       | 9.5.1      | Target outcome: Add class page (form: name, grade, section, capacity, academic year); verification: lint/typecheck pass; tests when applicable |
| 9.5.3      | Class detail page (students list, schedule, statistics)              | Frontend Lead | 3h       | 9.5.2      | Target outcome: Class detail page (students list, schedule, statistics); verification: lint/typecheck pass; tests when applicable              |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.6: Attendance Management

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.5 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                                                  | Owner         | Estimate | Dependency | Acceptance                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.6.1      | Attendance page (class selector + date picker + attendance grid)           | Frontend Lead | 3h       | 9.5.3      | Target outcome: Attendance page (class selector + date picker + attendance grid); verification: lint/typecheck pass; tests when applicable           |
| 9.6.2      | Attendance grid component (students list with present/absent/late buttons) | Frontend Lead | 2h       | 9.6.1      | Target outcome: Attendance grid component (students list with present/absent/late buttons); verification: lint/typecheck pass; tests when applicable |
| 9.6.3      | Attendance report (monthly/weekly stats, charts)                           | Frontend Lead | 3h       | 9.6.2      | Target outcome: Attendance report (monthly/weekly stats, charts); verification: lint/typecheck pass; tests when applicable                           |
| 9.6.4      | Attendance filters (class, date range, status)                             | Frontend Lead | 3h       | 9.6.3      | Target outcome: Attendance filters (class, date range, status); verification: lint/typecheck pass; tests when applicable                             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.7: Finance

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.6 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                              | Owner         | Estimate | Dependency | Acceptance                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9.7.1      | Finance overview page (KPI cards: collected, pending, overdue + chart) | Frontend Lead | 3h       | 9.6.4      | Target outcome: Finance overview page (KPI cards: collected, pending, overdue + chart); verification: lint/typecheck pass; tests when applicable |
| 9.7.2      | Payments page (DataTable: student, amount, date, status, receipt)      | Frontend Lead | 3h       | 9.7.1      | Target outcome: Payments page (DataTable: student, amount, date, status, receipt); verification: lint/typecheck pass; tests when applicable      |
| 9.7.3      | Payment form (record payment)                                          | Frontend Lead | 3h       | 9.7.2      | Target outcome: Payment form (record payment); verification: lint/typecheck pass; tests when applicable                                          |
| 9.7.4      | Invoices page (generate, send, track)                                  | Frontend Lead | 3h       | 9.7.3      | Target outcome: Invoices page (generate, send, track); verification: lint/typecheck pass; tests when applicable                                  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.8: Exams

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.7 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                                              |
| ---------- | ------------------------------------------------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 9.8.1      | Exams list page (DataTable: name, type, date, subject, class) | Frontend Lead | 3h       | 9.7.4      | Target outcome: Exams list page (DataTable: name, type, date, subject, class); verification: lint/typecheck pass; tests when applicable |
| 9.8.2      | Create exam page (form)                                       | Frontend Lead | 3h       | 9.8.1      | Target outcome: Create exam page (form); verification: lint/typecheck pass; tests when applicable                                       |
| 9.8.3      | Exam detail page (results table, statistics)                  | Frontend Lead | 3h       | 9.8.2      | Target outcome: Exam detail page (results table, statistics); verification: lint/typecheck pass; tests when applicable                  |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.9: Schedule

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.8 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                       | Owner         | Estimate | Dependency | Acceptance                                                                                                                |
| ---------- | ----------------------------------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 9.9.1      | Schedule management page (weekly calendar view) | Frontend Lead | 4h       | 9.8.3      | Target outcome: Schedule management page (weekly calendar view); verification: lint/typecheck pass; tests when applicable |
| 9.9.2      | Schedule form (add/edit schedule entry)         | Frontend Lead | 3h       | 9.9.1      | Target outcome: Schedule form (add/edit schedule entry); verification: lint/typecheck pass; tests when applicable         |
| 9.9.3      | Conflict detection UI                           | Frontend Lead | 2h       | 9.9.2      | Target outcome: Conflict detection UI; verification: lint/typecheck pass; tests when applicable                           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.10: Notices & Calendar

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.9 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                      | Owner         | Estimate | Dependency | Acceptance                                                                                                                               |
| ---------- | -------------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 9.10.1     | Notices list page (cards: title, priority badge, date, target) | Frontend Lead | 3h       | 9.9.3      | Target outcome: Notices list page (cards: title, priority badge, date, target); verification: lint/typecheck pass; tests when applicable |
| 9.10.2     | Create notice page (form with rich text)                       | Frontend Lead | 3h       | 9.10.1     | Target outcome: Create notice page (form with rich text); verification: lint/typecheck pass; tests when applicable                       |
| 9.10.3     | Events calendar page (monthly/weekly view, drag-drop)          | Frontend Lead | 3h       | 9.10.2     | Target outcome: Events calendar page (monthly/weekly view, drag-drop); verification: lint/typecheck pass; tests when applicable          |
| 9.10.4     | Event form                                                     | Frontend Lead | 3h       | 9.10.3     | Target outcome: Event form; verification: lint/typecheck pass; tests when applicable                                                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 9.11: Admin Profile & Settings

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 9.10 completed
- **Task Estimate**: 13h

| Subtask ID | Work item                                                     | Owner         | Estimate | Dependency | Acceptance                                                                                                                              |
| ---------- | ------------------------------------------------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 9.11.1     | Profile page (avatar, info, password change)                  | Frontend Lead | 3h       | 9.10.4     | Target outcome: Profile page (avatar, info, password change); verification: lint/typecheck pass; tests when applicable                  |
| 9.11.2     | School settings (general, academic year, terms, grade scales) | Frontend Lead | 2h       | 9.11.1     | Target outcome: School settings (general, academic year, terms, grade scales); verification: lint/typecheck pass; tests when applicable |
| 9.11.3     | Academic settings page (years, terms management)              | Frontend Lead | 4h       | 9.11.2     | Target outcome: Academic settings page (years, terms management); verification: lint/typecheck pass; tests when applicable              |
| 9.11.4     | Grading settings page (grade scales CRUD)                     | Frontend Lead | 4h       | 9.11.3     | Target outcome: Grading settings page (grade scales CRUD); verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 9 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 10: O'QITUVCHI PANELI

**Maqsad**: [school].talimy.space/teacher
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 9 exit gate

### Task 10.1: Teacher Layout & Dashboard

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 10 entry gate
- **Task Estimate**: 12h

| Subtask ID | Work item                                                          | Owner         | Estimate | Dependency         | Acceptance                                                                                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1.1     | Teacher sidebar layout                                             | Frontend Lead | 4h       | FAZA 10 entry gate | Target outcome: Teacher sidebar layout; verification: lint/typecheck pass; tests when applicable                                             |
| 10.1.2     | Dashboard (KPI: my students, today's classes, pending assignments) | Frontend Lead | 4h       | 10.1.1             | Target outcome: Dashboard (KPI: my students, today's classes, pending assignments); verification: lint/typecheck pass; tests when applicable |
| 10.1.3     | Today's schedule card                                              | Frontend Lead | 2h       | 10.1.2             | Target outcome: Today's schedule card; verification: lint/typecheck pass; tests when applicable                                              |
| 10.1.4     | Pending tasks card (ungraded assignments, unmarked attendance)     | Frontend Lead | 2h       | 10.1.3             | Target outcome: Pending tasks card (ungraded assignments, unmarked attendance); verification: lint/typecheck pass; tests when applicable     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.2: Teacher - Students

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.1 completed
- **Task Estimate**: 6h

| Subtask ID | Work item                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                                         |
| ---------- | -------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 10.2.1     | My students page (students in my classes)                | Frontend Lead | 3h       | 10.1.4     | Target outcome: My students page (students in my classes); verification: lint/typecheck pass; tests when applicable                |
| 10.2.2     | Student detail page (grades, attendance for my subjects) | Frontend Lead | 3h       | 10.2.1     | Target outcome: Student detail page (grades, attendance for my subjects); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.3: Teacher - Attendance

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.2 completed
- **Task Estimate**: 6h

| Subtask ID | Work item                                              | Owner         | Estimate | Dependency | Acceptance                                                                                                                       |
| ---------- | ------------------------------------------------------ | ------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 10.3.1     | Mark attendance page (select class -> attendance grid) | Frontend Lead | 3h       | 10.2.2     | Target outcome: Mark attendance page (select class -> attendance grid); verification: lint/typecheck pass; tests when applicable |
| 10.3.2     | Attendance history page                                | Frontend Lead | 3h       | 10.3.1     | Target outcome: Attendance history page; verification: lint/typecheck pass; tests when applicable                                |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.4: Teacher - Assignments

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.3 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                          | Owner         | Estimate | Dependency | Acceptance                                                                                                                   |
| ---------- | -------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 10.4.1     | Assignments list page                              | Frontend Lead | 3h       | 10.3.2     | Target outcome: Assignments list page; verification: lint/typecheck pass; tests when applicable                              |
| 10.4.2     | Create assignment page (form + file upload)        | Frontend Lead | 3h       | 10.4.1     | Target outcome: Create assignment page (form + file upload); verification: lint/typecheck pass; tests when applicable        |
| 10.4.3     | Assignment detail page (submissions list, grading) | Frontend Lead | 3h       | 10.4.2     | Target outcome: Assignment detail page (submissions list, grading); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.5: Teacher - Grades

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.4 completed
- **Task Estimate**: 5h

| Subtask ID | Work item                                                           | Owner         | Estimate | Dependency | Acceptance                                                                                                                                    |
| ---------- | ------------------------------------------------------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.5.1     | Grade entry page (class/subject -> students table with grade input) | Frontend Lead | 3h       | 10.4.3     | Target outcome: Grade entry page (class/subject -> students table with grade input); verification: lint/typecheck pass; tests when applicable |
| 10.5.2     | Grade overview (my subjects/classes statistics)                     | Frontend Lead | 2h       | 10.5.1     | Target outcome: Grade overview (my subjects/classes statistics); verification: lint/typecheck pass; tests when applicable                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.6: Teacher - Exams

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.5 completed
- **Task Estimate**: 6h

| Subtask ID | Work item               | Owner         | Estimate | Dependency | Acceptance                                                                                        |
| ---------- | ----------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------- |
| 10.6.1     | Exams list page         | Frontend Lead | 3h       | 10.5.2     | Target outcome: Exams list page; verification: lint/typecheck pass; tests when applicable         |
| 10.6.2     | Exam results entry page | Frontend Lead | 3h       | 10.6.1     | Target outcome: Exam results entry page; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 10.7: Teacher - Other

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 10.6 completed
- **Task Estimate**: 15h

| Subtask ID | Work item                                         | Owner         | Estimate | Dependency | Acceptance                                                                                                                  |
| ---------- | ------------------------------------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 10.7.1     | Schedule page (my weekly schedule, calendar view) | Frontend Lead | 3h       | 10.6.2     | Target outcome: Schedule page (my weekly schedule, calendar view); verification: lint/typecheck pass; tests when applicable |
| 10.7.2     | Notices page (view notices)                       | Frontend Lead | 3h       | 10.7.1     | Target outcome: Notices page (view notices); verification: lint/typecheck pass; tests when applicable                       |
| 10.7.3     | Calendar page (events)                            | Frontend Lead | 3h       | 10.7.2     | Target outcome: Calendar page (events); verification: lint/typecheck pass; tests when applicable                            |
| 10.7.4     | Profile page                                      | Frontend Lead | 3h       | 10.7.3     | Target outcome: Profile page; verification: lint/typecheck pass; tests when applicable                                      |
| 10.7.5     | Settings page                                     | Frontend Lead | 3h       | 10.7.4     | Target outcome: Settings page; verification: lint/typecheck pass; tests when applicable                                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 10 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 11: O'QUVCHI PANELI

**Maqsad**: [school].talimy.space/student
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 10 exit gate

### Task 11.1: Student Layout & Dashboard

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 11 entry gate
- **Task Estimate**: 14h

| Subtask ID | Work item                                               | Owner         | Estimate | Dependency         | Acceptance                                                                                                                        |
| ---------- | ------------------------------------------------------- | ------------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 11.1.1     | Student sidebar layout                                  | Frontend Lead | 4h       | FAZA 11 entry gate | Target outcome: Student sidebar layout; verification: lint/typecheck pass; tests when applicable                                  |
| 11.1.2     | Dashboard (KPI: GPA, attendance %, pending assignments) | Frontend Lead | 4h       | 11.1.1             | Target outcome: Dashboard (KPI: GPA, attendance %, pending assignments); verification: lint/typecheck pass; tests when applicable |
| 11.1.3     | AI insight card (motivational advice, study tips)       | Frontend Lead | 2h       | 11.1.2             | Target outcome: AI insight card (motivational advice, study tips); verification: lint/typecheck pass; tests when applicable       |
| 11.1.4     | Today's schedule card                                   | Frontend Lead | 2h       | 11.1.3             | Target outcome: Today's schedule card; verification: lint/typecheck pass; tests when applicable                                   |
| 11.1.5     | Upcoming exams card                                     | Frontend Lead | 2h       | 11.1.4             | Target outcome: Upcoming exams card; verification: lint/typecheck pass; tests when applicable                                     |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 11.2: Student Pages

- **Task Owner**: Frontend Lead
- **Task Dependency**: Task 11.1 completed
- **Task Estimate**: 30h

| Subtask ID | Work item                                                 | Owner         | Estimate | Dependency | Acceptance                                                                                                                          |
| ---------- | --------------------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 11.2.1     | Schedule page (weekly timetable, calendar view)           | Frontend Lead | 3h       | 11.1.5     | Target outcome: Schedule page (weekly timetable, calendar view); verification: lint/typecheck pass; tests when applicable           |
| 11.2.2     | Assignments page (list: title, subject, due date, status) | Frontend Lead | 3h       | 11.2.1     | Target outcome: Assignments page (list: title, subject, due date, status); verification: lint/typecheck pass; tests when applicable |
| 11.2.3     | Assignment detail page (description + file submission)    | Frontend Lead | 3h       | 11.2.2     | Target outcome: Assignment detail page (description + file submission); verification: lint/typecheck pass; tests when applicable    |
| 11.2.4     | Grades page (by subject, by term, trend chart)            | Frontend Lead | 3h       | 11.2.3     | Target outcome: Grades page (by subject, by term, trend chart); verification: lint/typecheck pass; tests when applicable            |
| 11.2.5     | Exams page (upcoming + results)                           | Frontend Lead | 3h       | 11.2.4     | Target outcome: Exams page (upcoming + results); verification: lint/typecheck pass; tests when applicable                           |
| 11.2.6     | Exam detail page (result, rank)                           | Frontend Lead | 3h       | 11.2.5     | Target outcome: Exam detail page (result, rank); verification: lint/typecheck pass; tests when applicable                           |
| 11.2.7     | Attendance page (monthly calendar view, statistics)       | Frontend Lead | 3h       | 11.2.6     | Target outcome: Attendance page (monthly calendar view, statistics); verification: lint/typecheck pass; tests when applicable       |
| 11.2.8     | Notices page (announcements)                              | Frontend Lead | 3h       | 11.2.7     | Target outcome: Notices page (announcements); verification: lint/typecheck pass; tests when applicable                              |
| 11.2.9     | Calendar page (events)                                    | Frontend Lead | 3h       | 11.2.8     | Target outcome: Calendar page (events); verification: lint/typecheck pass; tests when applicable                                    |
| 11.2.10    | Profile page                                              | Frontend Lead | 3h       | 11.2.9     | Target outcome: Profile page; verification: lint/typecheck pass; tests when applicable                                              |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 11 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 12: OTA-ONA PANELI

**Maqsad**: [school].talimy.space/parent
**Phase Owner (default)**: Frontend Lead
**Entry Dependency**: FAZA 11 exit gate

### Task 12.1: Parent Layout & Pages

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 12 entry gate
- **Task Estimate**: 19h

| Subtask ID | Work item                                             | Owner         | Estimate | Dependency         | Acceptance                                                                                                                      |
| ---------- | ----------------------------------------------------- | ------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 12.1.1     | Parent sidebar layout (minimal: dashboard, profile)   | Frontend Lead | 4h       | FAZA 12 entry gate | Target outcome: Parent sidebar layout (minimal: dashboard, profile); verification: lint/typecheck pass; tests when applicable   |
| 12.1.2     | Dashboard page (child selector if multiple children)  | Frontend Lead | 4h       | 12.1.1             | Target outcome: Dashboard page (child selector if multiple children); verification: lint/typecheck pass; tests when applicable  |
| 12.1.3     | Child overview card (grades, attendance, assignments) | Frontend Lead | 2h       | 12.1.2             | Target outcome: Child overview card (grades, attendance, assignments); verification: lint/typecheck pass; tests when applicable |
| 12.1.4     | Child grades card (recent grades, trend)              | Frontend Lead | 2h       | 12.1.3             | Target outcome: Child grades card (recent grades, trend); verification: lint/typecheck pass; tests when applicable              |
| 12.1.5     | Child attendance card (monthly stats)                 | Frontend Lead | 2h       | 12.1.4             | Target outcome: Child attendance card (monthly stats); verification: lint/typecheck pass; tests when applicable                 |
| 12.1.6     | Child assignments card (pending, completed)           | Frontend Lead | 2h       | 12.1.5             | Target outcome: Child assignments card (pending, completed); verification: lint/typecheck pass; tests when applicable           |
| 12.1.7     | Profile page                                          | Frontend Lead | 3h       | 12.1.6             | Target outcome: Profile page; verification: lint/typecheck pass; tests when applicable                                          |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 12 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 13: REAL-TIME VA NOTIFICATIONS

**Maqsad**: Socket.IO + push notifications
**Phase Owner (default)**: Backend Lead
**Entry Dependency**: FAZA 12 exit gate

### Task 13.1: Real-time Infrastructure

- **Task Owner**: Backend Lead
- **Task Dependency**: FAZA 13 entry gate
- **Task Estimate**: 14h

| Subtask ID | Work item                                          | Owner         | Estimate | Dependency         | Acceptance                                                                                                                   |
| ---------- | -------------------------------------------------- | ------------- | -------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 13.1.1     | Socket.IO server setup (NestJS gateway)            | Backend Lead  | 4h       | FAZA 13 entry gate | Target outcome: Socket.IO server setup (NestJS gateway); verification: lint/typecheck pass; tests when applicable            |
| 13.1.2     | Socket.IO client setup (Next.js)                   | Frontend Lead | 4h       | 13.1.1             | Target outcome: Socket.IO client setup (Next.js); verification: client connection/reconnect test in browser logs             |
| 13.1.3     | Room-based architecture (tenant rooms, user rooms) | Backend Lead  | 6h       | 13.1.2             | Target outcome: Room-based architecture (tenant rooms, user rooms); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 13.2: Notification System

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 13.1 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                                                            |
| ---------- | -------------------------------------------------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13.2.1     | In-app notifications (bell icon, dropdown, unread count) | Frontend Lead | 2h       | 13.1.3     | Target outcome: In-app notifications (bell icon, dropdown, unread count); verification: unread counter + dropdown rendering check with seeded events  |
| 13.2.2     | Real-time notification delivery (Socket.IO)              | Backend Lead  | 4h       | 13.2.1     | Target outcome: Real-time notification delivery (Socket.IO); verification: lint/typecheck pass; tests when applicable                                 |
| 13.2.3     | Email notifications (Resend via BullMQ)                  | Backend Lead  | 2h       | 13.2.2     | Target outcome: Email notifications (Resend via BullMQ); verification: lint/typecheck pass; tests when applicable                                     |
| 13.2.4     | SMS notifications (Twilio via BullMQ)                    | Backend Lead  | 2h       | 13.2.3     | Target outcome: SMS notifications (Twilio via BullMQ); verification: lint/typecheck pass; tests when applicable                                       |
| 13.2.5     | Notification preferences (user settings)                 | Frontend Lead | 2h       | 13.2.4     | Target outcome: Notification preferences (user settings) with backend API support; verification: preference save/load UI flow + API persistence check |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 13.3: Real-time Events

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 13.2 completed
- **Task Estimate**: 10h

| Subtask ID | Work item                                 | Owner        | Estimate | Dependency | Acceptance                                                                                                          |
| ---------- | ----------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 13.3.1     | Attendance marked -> notify parent        | Backend Lead | 2h       | 13.2.5     | Target outcome: Attendance marked -> notify parent; verification: lint/typecheck pass; tests when applicable        |
| 13.3.2     | New grade -> notify student + parent      | Backend Lead | 2h       | 13.3.1     | Target outcome: New grade -> notify student + parent; verification: lint/typecheck pass; tests when applicable      |
| 13.3.3     | New assignment -> notify students         | Backend Lead | 2h       | 13.3.2     | Target outcome: New assignment -> notify students; verification: lint/typecheck pass; tests when applicable         |
| 13.3.4     | New notice -> notify target role          | Backend Lead | 2h       | 13.3.3     | Target outcome: New notice -> notify target role; verification: lint/typecheck pass; tests when applicable          |
| 13.3.5     | Payment received -> notify admin + parent | Backend Lead | 2h       | 13.3.4     | Target outcome: Payment received -> notify admin + parent; verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 13 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 14: AI INTEGRATION

**Maqsad**: Claude API bilan AI xususiyatlar
**Phase Owner (default)**: Backend Lead
**Entry Dependency**: FAZA 13 exit gate

### Task 14.1: AI Service

- **Task Owner**: Backend Lead
- **Task Dependency**: FAZA 14 entry gate
- **Task Estimate**: 7h

| Subtask ID | Work item                                            | Owner        | Estimate | Dependency         | Acceptance                                                                                                                     |
| ---------- | ---------------------------------------------------- | ------------ | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 14.1.1     | Claude API client setup (Anthropic SDK)              | Backend Lead | 2h       | FAZA 14 entry gate | Target outcome: Claude API client setup (Anthropic SDK); verification: lint/typecheck pass; tests when applicable              |
| 14.1.2     | Prompt templates (student advice, report generation) | Backend Lead | 3h       | 14.1.1             | Target outcome: Prompt templates (student advice, report generation); verification: lint/typecheck pass; tests when applicable |
| 14.1.3     | Token usage tracking & limits                        | Backend Lead | 2h       | 14.1.2             | Target outcome: Token usage tracking & limits; verification: lint/typecheck pass; tests when applicable                        |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 14.2: Student AI Insights

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 14.1 completed
- **Task Estimate**: 8h

| Subtask ID | Work item                                             | Owner        | Estimate | Dependency | Acceptance                                                                                                                      |
| ---------- | ----------------------------------------------------- | ------------ | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 14.2.1     | AI insight generation based on grades/attendance data | Backend Lead | 2h       | 14.1.3     | Target outcome: AI insight generation based on grades/attendance data; verification: lint/typecheck pass; tests when applicable |
| 14.2.2     | AI insight card on student dashboard                  | Backend Lead | 4h       | 14.2.1     | Target outcome: AI insight card on student dashboard; verification: lint/typecheck pass; tests when applicable                  |
| 14.2.3     | Chat interface for students (motivational Q&A)        | Backend Lead | 2h       | 14.2.2     | Target outcome: Chat interface for students (motivational Q&A); verification: lint/typecheck pass; tests when applicable        |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 14.3: Admin AI Reports

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 14.2 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                                                 | Owner        | Estimate | Dependency | Acceptance                                                                                                                          |
| ---------- | --------------------------------------------------------- | ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 14.3.1     | AI-powered report generation (school performance, trends) | Backend Lead | 6h       | 14.2.3     | Target outcome: AI-powered report generation (school performance, trends); verification: lint/typecheck pass; tests when applicable |
| 14.3.2     | Report templates (attendance, grades, finance)            | Backend Lead | 3h       | 14.3.1     | Target outcome: Report templates (attendance, grades, finance); verification: lint/typecheck pass; tests when applicable            |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 14.4: Parent Telegram Bot (Optional)

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 14.3 completed
- **Task Estimate**: 9h

| Subtask ID | Work item                 | Owner        | Estimate | Dependency | Acceptance                                                                                          |
| ---------- | ------------------------- | ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------- |
| 14.4.1     | Telegram bot setup        | Backend Lead | 2h       | 14.3.2     | Target outcome: Telegram bot setup; verification: lint/typecheck pass; tests when applicable        |
| 14.4.2     | Grade alert (< 50%)       | Backend Lead | 2h       | 14.4.1     | Target outcome: Grade alert (< 50%); verification: lint/typecheck pass; tests when applicable       |
| 14.4.3     | Attendance alert (absent) | Backend Lead | 2h       | 14.4.2     | Target outcome: Attendance alert (absent); verification: lint/typecheck pass; tests when applicable |
| 14.4.4     | Webhook handler           | Backend Lead | 3h       | 14.4.3     | Target outcome: Webhook handler; verification: lint/typecheck pass; tests when applicable           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 14 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 15: SEO, PERFORMANCE, SECURITY

**Maqsad**: Production-ready optimization
**Phase Owner (default)**: Backend Lead
**Entry Dependency**: FAZA 14 exit gate

### Task 15.1: SEO

- **Task Owner**: Frontend Lead
- **Task Dependency**: FAZA 15 entry gate
- **Task Estimate**: 11h

| Subtask ID | Work item                                              | Owner         | Estimate | Dependency         | Acceptance                                                                                                                       |
| ---------- | ------------------------------------------------------ | ------------- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 15.1.1     | Dynamic meta tags (generateMetadata for each page)     | Frontend Lead | 3h       | FAZA 15 entry gate | Target outcome: Dynamic meta tags (generateMetadata for each page); verification: lint/typecheck pass; tests when applicable     |
| 15.1.2     | JSON-LD structured data (Organization, WebApplication) | Backend Lead  | 2h       | 15.1.1             | Target outcome: JSON-LD structured data (Organization, WebApplication); verification: lint/typecheck pass; tests when applicable |
| 15.1.3     | sitemap.xml (dynamic generation)                       | Frontend Lead | 2h       | 15.1.2             | Target outcome: sitemap.xml (dynamic generation); verification: lint/typecheck pass; tests when applicable                       |
| 15.1.4     | robots.txt                                             | Frontend Lead | 2h       | 15.1.3             | Target outcome: robots.txt; verification: lint/typecheck pass; tests when applicable                                             |
| 15.1.5     | Open Graph images                                      | Frontend Lead | 2h       | 15.1.4             | Target outcome: Open Graph images; verification: lint/typecheck pass; tests when applicable                                      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 15.2: Performance

- **Task Owner**: Backend Lead
- **Task Dependency**: Task 15.1 completed
- **Task Estimate**: 24h

| Subtask ID | Work item                                           | Owner        | Estimate | Dependency | Acceptance                                                                                                                    |
| ---------- | --------------------------------------------------- | ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 15.2.1     | Partial Prerendering (Next.js 16)                   | Backend Lead | 2h       | 15.1.5     | Target outcome: Partial Prerendering (Next.js 16); verification: lint/typecheck pass; tests when applicable                   |
| 15.2.2     | Image optimization (next/image, WebP, lazy loading) | Backend Lead | 6h       | 15.2.1     | Target outcome: Image optimization (next/image, WebP, lazy loading); verification: lint/typecheck pass; tests when applicable |
| 15.2.3     | Code splitting (dynamic imports)                    | Backend Lead | 2h       | 15.2.2     | Target outcome: Code splitting (dynamic imports); verification: lint/typecheck pass; tests when applicable                    |
| 15.2.4     | Redis caching strategy                              | Backend Lead | 2h       | 15.2.3     | Target outcome: Redis caching strategy; verification: lint/typecheck pass; tests when applicable                              |
| 15.2.5     | Database query optimization (indexes, pagination)   | Backend Lead | 6h       | 15.2.4     | Target outcome: Database query optimization (indexes, pagination); verification: lint/typecheck pass; tests when applicable   |
| 15.2.6     | Bundle analysis + optimization                      | Backend Lead | 6h       | 15.2.5     | Target outcome: Bundle analysis + optimization; verification: lint/typecheck pass; tests when applicable                      |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 15.3: Security

- **Task Owner**: Security Lead
- **Task Dependency**: Task 15.2 completed
- **Task Estimate**: 17h

| Subtask ID | Work item                                                | Owner         | Estimate | Dependency | Acceptance                                                                                                                         |
| ---------- | -------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 15.3.1     | CORS configuration                                       | Security Lead | 3h       | 15.2.6     | Target outcome: CORS configuration; verification: lint/typecheck pass; tests when applicable                                       |
| 15.3.2     | CSP headers                                              | Security Lead | 2h       | 15.3.1     | Target outcome: CSP headers; verification: lint/typecheck pass; tests when applicable                                              |
| 15.3.3     | Rate limiting (auth endpoints: 5/min, API: 100/min)      | Security Lead | 4h       | 15.3.2     | Target outcome: Rate limiting (auth endpoints: 5/min, API: 100/min); verification: lint/typecheck pass; tests when applicable      |
| 15.3.4     | Input sanitization (Zod on all inputs)                   | Security Lead | 2h       | 15.3.3     | Target outcome: Input sanitization (Zod on all inputs); verification: lint/typecheck pass; tests when applicable                   |
| 15.3.5     | SQL injection prevention (Drizzle parameterized queries) | Security Lead | 2h       | 15.3.4     | Target outcome: SQL injection prevention (Drizzle parameterized queries); verification: lint/typecheck pass; tests when applicable |
| 15.3.6     | XSS prevention                                           | Security Lead | 2h       | 15.3.5     | Target outcome: XSS prevention; verification: lint/typecheck pass; tests when applicable                                           |
| 15.3.7     | Secure HTTP headers (Helmet)                             | Security Lead | 2h       | 15.3.6     | Target outcome: Secure HTTP headers (Helmet); verification: lint/typecheck pass; tests when applicable                             |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 15 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 16: TESTING

**Maqsad**: Test coverage
**Phase Owner (default)**: QA Lead
**Entry Dependency**: FAZA 15 exit gate

### Task 16.1: Backend Tests

- **Task Owner**: QA Lead
- **Task Dependency**: FAZA 16 entry gate
- **Task Estimate**: 16h

| Subtask ID | Work item                                                           | Owner   | Estimate | Dependency         | Acceptance                                                                                                                                    |
| ---------- | ------------------------------------------------------------------- | ------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 16.1.1     | Unit tests (services: auth, teachers, students, attendance, grades) | QA Lead | 4h       | FAZA 16 entry gate | Target outcome: Unit tests (services: auth, teachers, students, attendance, grades); verification: lint/typecheck pass; tests when applicable |
| 16.1.2     | Integration tests (controllers + database)                          | QA Lead | 6h       | 16.1.1             | Target outcome: Integration tests (controllers + database); verification: lint/typecheck pass; tests when applicable                          |
| 16.1.3     | E2E tests (full API flow)                                           | QA Lead | 6h       | 16.1.2             | Target outcome: E2E tests (full API flow); verification: lint/typecheck pass; tests when applicable                                           |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 16.2: Frontend Tests

- **Task Owner**: QA Lead
- **Task Dependency**: Task 16.1 completed
- **Task Estimate**: 11h

| Subtask ID | Work item                                  | Owner   | Estimate | Dependency | Acceptance                                                                                                           |
| ---------- | ------------------------------------------ | ------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 16.2.1     | Component tests (Vitest + Testing Library) | QA Lead | 2h       | 16.1.3     | Target outcome: Component tests (Vitest + Testing Library); verification: lint/typecheck pass; tests when applicable |
| 16.2.2     | Hook tests                                 | QA Lead | 3h       | 16.2.1     | Target outcome: Hook tests; verification: lint/typecheck pass; tests when applicable                                 |
| 16.2.3     | E2E tests (Playwright - login, CRUD flows) | QA Lead | 6h       | 16.2.2     | Target outcome: E2E tests (Playwright - login, CRUD flows); verification: lint/typecheck pass; tests when applicable |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 16 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## FAZA 17: CI/CD VA DEPLOYMENT

**Maqsad**: Production deployment pipeline
**Phase Owner (default)**: DevOps Lead
**Entry Dependency**: FAZA 16 exit gate

### Task 17.1: GitHub Actions

- **Task Owner**: DevOps Lead
- **Task Dependency**: FAZA 17 entry gate
- **Task Estimate**: 6h

| Subtask ID | Work item                                                | Owner       | Estimate | Dependency         | Acceptance                                                                                                                                    |
| ---------- | -------------------------------------------------------- | ----------- | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 17.1.1     | CI pipeline (lint, typecheck, test on PR)                | DevOps Lead | 2h       | FAZA 17 entry gate | Target outcome: CI pipeline (lint, typecheck, test on PR); verification: workflow yaml + successful GitHub Actions run link                   |
| 17.1.2     | CD web (auto-deploy to Vercel on main merge)             | DevOps Lead | 2h       | 17.1.1             | Target outcome: CD web (auto-deploy to Vercel on main merge); verification: workflow yaml + Vercel deployment URL                             |
| 17.1.3     | CD api (auto-deploy to self-hosted server on main merge) | DevOps Lead | 2h       | 17.1.2             | Target outcome: CD api (auto-deploy to self-hosted server on main merge); verification: workflow yaml + server deploy log/health-check output |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 17.2: Deployment Config

- **Task Owner**: DevOps Lead
- **Task Dependency**: Task 17.1 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                                                    | Owner       | Estimate | Dependency | Acceptance                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------- | ----------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17.2.1     | Vercel project config (env vars, domains, build settings)                    | DevOps Lead | 3h       | 17.1.3     | Target outcome: Vercel project config (env vars, domains, build settings); verification: Vercel project settings screenshot/export + domain resolve check         |
| 17.2.2     | Self-hosted API config (Nginx reverse proxy, SSL, PM2/systemd, health check) | DevOps Lead | 3h       | 17.2.1     | Target outcome: Self-hosted API config (Nginx reverse proxy, SSL, PM2/systemd, health check); verification: Nginx config path + SSL check + `/health` curl output |
| 17.2.3     | Cloudflare DNS setup (talimy.space, \*.talimy.space wildcard)                | DevOps Lead | 2h       | 17.2.2     | Target outcome: Cloudflare DNS setup (talimy.space, \*.talimy.space wildcard); verification: DNS record list + `dig/nslookup` result                              |
| 17.2.4     | Supabase self-hosted PostgreSQL production setup                             | DevOps Lead | 2h       | 17.2.3     | Target outcome: Supabase self-hosted PostgreSQL production setup; verification: connection test output + backup/restore runbook entry                             |
| 17.2.5     | Self-hosted Redis production setup (rediss:// + WireGuard ACL)               | DevOps Lead | 2h       | 17.2.4     | Target outcome: Self-hosted Redis production setup (rediss:// + WireGuard ACL); verification: `rediss://` connectivity check + ACL policy snapshot                |

#### Task 17.2 Implementation Runbook: Dokploy (talimy.space)

1. Dokploy'da yangi `Project` oching: `talimy`.
2. Git source ulang: repo branch (`main` yoki deployment branch) va auto-deploy trigger sozlang.
3. `Service 1` yarating: `talimy-web` (Next.js).
4. `talimy-web` uchun root/build context: `apps/web`.
5. `talimy-web` run command: `bun run build && bun run start` (port: `3000`).
6. `talimy-web` domain mapping qo'shing: `talimy.space`, `platform.talimy.space`, `*.talimy.space` (wildcard).
7. `talimy-web` env kiriting (exact file scope bo'yicha): `apps/web/.env.local` dagi `NEXT_PUBLIC_*` qiymatlari (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`).
8. `Service 2` yarating: `talimy-api` (NestJS).
9. `talimy-api` uchun root/build context: `apps/api`.
10. `talimy-api` run command: `bun run build && bun run start:prod` (port: `4000`).
11. `talimy-api` domain mapping qo'shing: `api.talimy.space`.
12. `talimy-api` env kiriting (exact file scope bo'yicha): `apps/api/.env` dagi backend envlar (`DATABASE_URL`, `REDIS_URL`, `JWT_*`, `R2_*`, `RESEND_*`, `TWILIO_*`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `AXIOM_TOKEN`).
13. Dokploy reverse-proxy/SSL ni yoqing (Let's Encrypt), wildcard va API domain sertifikatlari aktivligini tekshiring.
14. Health check sozlang: web (`/`), api (`/health`).
15. Deploy qiling va smoke-test bajaring:
    `https://talimy.space`, `https://platform.talimy.space`, `https://[school-slug].talimy.space/admin`, `https://api.talimy.space/health`.
16. Post-deploy verification:
    `proxy.ts` subdomain routing, login redirect, API connectivity, Supabase/Redis ulanish loglari.
17. Rollback qoidasini yozing:
    Dokploy previous successful release ga qaytish + DNS/cert holatini qayta tekshirish.

#### Task 17.2.1 Production Stability Guardrails (2026-02-21 lessons)

1. GHCR image reference har doim lowercase bo'lsin (`${IMAGE_REF,,}`), aks holda `invalid reference format` xatosi chiqadi.
2. `type=sha,prefix=sha-` ishlatilganda verify/pull uchun short SHA (`${GITHUB_SHA::7}`) bilan tag ishlating.
3. Dockerfile runtime command va workflow verify check bir xil sintaksisda bo'lsin:
   - Web: `bun run --cwd apps/web start`
   - API: `bun run --cwd apps/api start:prod`
4. Build stage artifact check majburiy:
   - Web: `.next/BUILD_ID`
   - API: `dist/main(.js)`
5. Dokploy service'da image `CMD` to'g'ri bo'lsa `Run Command` bo'sh qoldiriladi; noto'g'ri override (`bun run`) restart loop beradi.
6. API global `ValidationPipe` ishlatilsa `class-validator` va `class-transformer` runtime dependencies bo'lishi shart.
7. Sentry test endpoint (`/api/debug-sentry`) faqat verification uchun; event tushganidan keyin production'dan olib tashlanadi.
8. Post-deploy smoke-check minimal ro'yxati:
   - `https://talimy.space`
   - `https://platform.talimy.space`
   - `https://api.talimy.space/api/health`
9. Domain UX guardrail: `platform.talimy.space` va `talimy.space` landing matni ajralib turishi kerak.

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### Task 17.3: Monitoring

- **Task Owner**: DevOps Lead
- **Task Dependency**: Task 17.2 completed
- **Task Estimate**: 12h

| Subtask ID | Work item                                        | Owner       | Estimate | Dependency | Acceptance                                                                                                                      |
| ---------- | ------------------------------------------------ | ----------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 17.3.1     | Sentry setup (frontend + backend error tracking) | DevOps Lead | 2h       | 17.2.5     | Target outcome: Sentry setup (frontend + backend error tracking); verification: DSN wiring paths + test event visible in Sentry |
| 17.3.2     | Axiom setup (structured logging)                 | DevOps Lead | 2h       | 17.3.1     | Target outcome: Axiom setup (structured logging); verification: sample structured log arrives in Axiom dataset                  |
| 17.3.3     | Health check endpoints                           | DevOps Lead | 2h       | 17.3.2     | Target outcome: Health check endpoints; verification: `/health` and dependency checks return expected JSON                      |
| 17.3.4     | Uptime monitoring                                | DevOps Lead | 6h       | 17.3.3     | Target outcome: Uptime monitoring; verification: monitor config + alert channel test notification                               |

- **Task Exit Criteria**: all subtasks done + Global DoD satisfied.

### FAZA 17 Exit Gate

1. All task exit criteria in this phase are passed.
2. No blocker/high-severity defect remains open for this phase scope.
3. Artifacts (code/tests/docs/config) are committed and review-ready.

---

## 5. Weekly reporting template

1. Completed subtasks (by ID)
2. Blocked subtasks + blocker reason + owner
3. Risks discovered and mitigation updates
4. Next-week commitment (IDs)

Total subtasks preserved from source: 436

This is the canonical detailed 0->100 execution plan.
