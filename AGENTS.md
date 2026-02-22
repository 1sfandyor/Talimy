# AGENTS.md — Talimy School Management Platform

> Bu fayl AI agentlar (Codex, Cursor, Copilot, Claude) uchun loyiha konteksti va qoidalarini belgilaydi.
> Har qanday kod yozishdan OLDIN shu faylni to'liq o'qing.

---

## 1. PROJECT OVERVIEW

**Talimy** — O'zbekiston maktablari uchun multi-tenant SaaS platformasi (School Management System).

- **Domain**: `talimy.space`
- **Architecture**: 3-tier multi-tenant (Platform Admin → School Admin → Teacher/Student/Parent)
- **Monorepo**: Turborepo 2.8 + Bun 1.3.9

### Tenant URL Structure

```
platform.talimy.space          → Platform Admin (Super Admin)
[school-slug].talimy.space/admin    → School Admin
[school-slug].talimy.space/teacher  → Teacher
[school-slug].talimy.space/student  → Student
[school-slug].talimy.space/parent   → Parent
talimy.space                        → Public marketing site
```

### 5 Roles

| Role             | Scope                         | Gender Filtering     |
| ---------------- | ----------------------------- | -------------------- |
| `platform_admin` | All schools                   | No                   |
| `school_admin`   | Own school only               | Yes (boys/girls/all) |
| `teacher`        | Own classes/subjects only     | No                   |
| `student`        | Own data only                 | No                   |
| `parent`         | Own children only (read-only) | No                   |

---

## 2. TECH STACK (Exact Versions — Do NOT Upgrade)

### Frontend (`apps/web`)

| Package               | Version | Purpose                                             |
| --------------------- | ------- | --------------------------------------------------- |
| Next.js               | 16.1.6  | App Router, Server Components, Partial Prerendering |
| TypeScript            | 5.9.3   | Strict mode                                         |
| TailwindCSS           | 4.0     | Styling (utility-first)                             |
| shadcn/ui             | v2      | UI component library                                |
| Zustand               | 5.0     | Client state management                             |
| TanStack Query        | v5      | Server state / data fetching                        |
| React Hook Form       | 7.54    | Form management                                     |
| Zod                   | 3.24    | Validation (shared with backend)                    |
| Recharts              | 2.15    | Charts and graphs                                   |
| next-intl             | 3.26    | i18n (uz, tr, en, ru)                               |
| Lucide React          | latest  | Icons                                               |
| Siloe (bun add sileo) | latest  | Toast notifications                                 |

### Backend (`apps/api`)

| Package       | Version | Purpose                                         |
| ------------- | ------- | ----------------------------------------------- |
| NestJS        | 11.1.4  | Backend framework                               |
| PostgreSQL    | 16.8    | Database (Supabase Self-hosted PostgreSQL)      |
| Drizzle ORM   | 0.38    | Type-safe ORM                                   |
| tRPC          | v11     | Type-safe API (primary)                         |
| REST          | —       | Fallback API (file uploads, webhooks)           |
| NextAuth.js   | v5      | Authentication                                  |
| Permify       | latest  | RBAC (gender-based access)                      |
| Redis         | 7.4     | Cache (self-hosted, `rediss://` over WireGuard) |
| BullMQ        | 5.24    | Job queues                                      |
| Socket.IO     | 4.8     | Real-time events                                |
| Cloudflare R2 | —       | File storage                                    |
| Resend        | —       | Email service                                   |
| Twilio        | —       | SMS service                                     |

### AI

| Provider  | Model           | Purpose                            |
| --------- | --------------- | ---------------------------------- |
| Anthropic | Claude Sonnet 4 | Student insights, AI reports, chat |

### DevOps

| Tool                   | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| Vercel                 | Frontend hosting                          |
| VPS (Self-hosted)      | Backend hosting (`api.talimy.space`)      |
| Supabase (Self-hosted) | PostgreSQL platform (self-managed)        |
| Self-hosted Redis      | Remote Redis over WireGuard (`rediss://`) |
| Cloudflare             | CDN + DNS + R2                            |
| Sentry                 | Error tracking                            |
| Axiom                  | Structured logging                        |
| GitHub Actions         | CI/CD                                     |

---

## 3. MONOREPO STRUCTURE

```
talimy/
├── turbo.json                    # Pipeline: build, dev, lint, typecheck
├── package.json                  # Bun workspaces + root scripts
├── tsconfig.base.json            # Shared TS config (strict)
├── .env.example                  # Remote Supabase PostgreSQL + Remote Redis (WireGuard)
│
├── packages/
│   ├── config-typescript/        # Shared tsconfig (base, nextjs, nestjs)
│   ├── config-eslint/            # Shared ESLint (base, next, nest)
│   ├── config-tailwind/          # Shared Tailwind preset (optional in v4 CSS-first)
│   ├── ui/                       # Shared UI components (shadcn/ui based)
│   ├── database/                 # Drizzle schema + migrations + seeds
│   ├── shared/                   # Types, validators (Zod), constants, utils
│   └── trpc/                     # tRPC routers (shared between apps)
│
├── apps/
│   ├── web/                      # Next.js 16 frontend
│   └── api/                      # NestJS 11 backend
│
└── tooling/
    ├── scripts/                  # setup.sh, seed.sh
    └── docs/                     # API docs, deployment guide
```

---

## 4. CODING STANDARDS

### 4.1 General Rules

- **Language**: TypeScript everywhere. NO `any` type. NO `@ts-ignore`.
- **Imports**: Always use `import type { ... }` for type-only imports.
- **Patterns**: Functional style preferred. Avoid `class` except NestJS modules/services.
- **Naming**:
  - Files: `kebab-case.ts` (e.g., `create-teacher.dto.ts`)
  - Components: `PascalCase` (e.g., `TeachersTable.tsx` → file: `teachers-table.tsx`)
  - Variables/functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Database tables: `snake_case`
  - Database columns: `camelCase` (Drizzle mapping)
- **Exports**: Named exports only. NO default exports (except Next.js pages).
- **Comments**: Only where logic is non-obvious. No JSDoc on self-explanatory code.

### 4.2 Frontend Standards (Next.js)

```typescript
// Server Component (default) — no "use client" directive
// Use for: data fetching, SEO, initial render
export default async function TeachersPage() {
  const teachers = await trpc.teacher.list.query();
  return <TeachersTable data={teachers} />;
}

// Client Component — only when needed (interactivity, hooks, browser APIs)
"use client";
export function TeachersTable({ data }: { data: Teacher[] }) { ... }
```

- **Server Components by default**. Only add `"use client"` when interactivity is needed.
- **Request interception file**: In Next.js 16 use `apps/web/proxy.ts` (NOT `middleware.ts`).
- **Data fetching**: Server Components + tRPC server caller. Client-side: TanStack Query + tRPC.
- **Forms**: React Hook Form + Zod resolver. Always validate with shared Zod schemas.
- **State**: Zustand for global client state. TanStack Query for server state. NO Redux.
- **Styling**: TailwindCSS utility classes. NO inline styles. NO CSS modules.
- **Tailwind v4 config mode**: CSS-first is primary (`@import "tailwindcss"` + `@theme` in global CSS). `tailwind.config.ts` is optional and only for tooling/plugin compatibility.
- **Responsive**: Mobile-first. Breakpoints: `sm:768px`, `md:1024px`, `lg:1280px`.
- **Reusable + modular components only**: Build small, focused components and compose them. Avoid monolithic files.
- **300-line split rule**: If a component file exceeds 300 lines, split it into smaller subcomponents/hooks/utils.
- **Future-proof structure**: New components MUST be organized so they can be split later without major refactor (clear responsibilities, isolated logic, composable props).
- **UI source priority (strict)**:
  1. ReUI components first (`@talimy/ui`).
  2. If not available, use shadcn equivalents from `packages/ui/src/components/ui`.
  3. If still missing, install/add the needed shadcn component and then use it.
- **Mandatory verification via shadcn MCP**: Before adding/recommending any fallback component, check availability with shadcn MCP tools (`get_project_registries`, `search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`) and use that result as the source of truth.
- **No raw primitive fallback for existing UI primitives**: Use `Button`, `Link`, `Image`, `Sidebar` style components instead of raw `<button>`, raw link/image/sidebar primitives when ReUI/shadcn alternatives exist.

### 4.3 Backend Standards (NestJS)

```typescript
// Standard module structure
@Module({
  imports: [DatabaseModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}

// Controller — thin, delegates to service
@Controller("teachers")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles("school_admin")
  findAll(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.teachersService.findAll(tenantId, query)
  }
}

// Service — all business logic here
@Injectable()
export class TeachersService {
  constructor(@Inject(DATABASE) private db: DrizzleDB) {}
  // ...
}
```

- **Thin controllers, fat services**. Controllers only handle HTTP; services hold logic.
- **Validation**: Zod pipes on all inputs. Use shared schemas from `@talimy/shared`.
- **Guards**: Apply in order: `AuthGuard` → `RolesGuard` → `TenantGuard` → `GenderGuard`.
- **Error handling**: Throw NestJS HTTP exceptions. Global filter catches all.
- **Pagination**: All list endpoints MUST support `page`, `limit`, `search`, `sort`, `order`.
- **Tenant isolation**: EVERY query MUST filter by `tenantId`. Never leak cross-tenant data.

### 4.4 Database Standards (Drizzle)

```typescript
// Schema definition pattern
import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core"

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 10 }).notNull(), // 'male' | 'female'
  // ... more columns
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

- **UUID** for all primary keys (`.defaultRandom()`).
- **Every table** with `tenantId` MUST have a foreign key to `tenants.id`.
- **Timestamps**: `createdAt` and `updatedAt` on every table.
- **Soft delete**: Use `deletedAt` column instead of actual DELETE (for audit trail).
- **JSONB**: Only for flexible/dynamic data (e.g., `ai_conversations.messages`, `invoices.items`).
- **Indexes**: On `tenantId`, `userId`, frequently filtered columns, and foreign keys.

---

## 5. API DESIGN

### 5.1 Standard Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
}
```

### 5.2 API Endpoints Summary

```
Auth:       POST /auth/login, /auth/register, /auth/refresh, /auth/logout
Tenants:    GET/POST /tenants, GET/PUT/DELETE /tenants/:id
Teachers:   GET/POST /teachers, GET/PUT/DELETE /teachers/:id
Students:   GET/POST /students, GET/PUT/DELETE /students/:id
Parents:    GET/POST /parents, GET/PUT/DELETE /parents/:id
Classes:    GET/POST /classes, GET/PUT/DELETE /classes/:id
Attendance: GET/POST /attendance, GET /attendance/report
Grades:     GET/POST /grades, GET /grades/report
Exams:      GET/POST /exams, GET/PUT/DELETE /exams/:id
Assignments: GET/POST /assignments, POST /assignments/:id/submit
Schedule:   GET/POST /schedule, GET /schedule/class/:classId
Finance:    GET/POST /payments, POST /invoices, GET /finance/overview
Notices:    GET/POST /notices
Notifications: GET /notifications, PUT /notifications/:id/read
Calendar:   GET/POST /events
AI:         POST /ai/chat, GET /ai/insights/:studentId, POST /ai/report/generate
Upload:     POST /upload
```

### 5.3 tRPC Router Structure

```
appRouter
├── auth      (login, register, refresh, logout, forgotPassword, resetPassword)
├── tenant    (list, getById, create, update, delete, stats, activate, deactivate)
├── teacher   (list, getById, create, update, delete, schedule, classes)
├── student   (list, getById, create, update, delete, grades, attendance)
├── parent    (list, getById, create, update, delete, children)
├── attendance (mark, getByClass, getByStudent, report)
├── grade     (enter, getByStudent, getByClass, report, scales)
├── exam      (list, create, update, delete, results, enterResults)
├── assignment (list, create, update, delete, submit, grade)
├── schedule  (list, create, update, delete, byClass, byTeacher)
├── finance   (payments, invoices, feeStructures, overview)
├── notification (list, markRead, unreadCount, send)
└── ai        (chat, insights, generateReport)
```

---

## 6. DESIGN SYSTEM

### Colors

```css
--primary: #1b8a4c; /* Green — main brand */
--secondary: #2e74b5; /* Blue — accents */
--background: #f8fafc; /* Light gray background */
--surface: #ffffff; /* Card/surface white */
--text-primary: #1e293b; /* Dark text */
--text-secondary: #64748b; /* Muted text */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Typography

```
Font: Inter (Google Fonts)
H1: 30px / font-weight: 700 (Dashboard titles)
H2: 24px / font-weight: 600 (Section titles)
H3: 20px / font-weight: 600 (Card titles)
Body: 14px / font-weight: 400 (Default text)
Small: 12px / font-weight: 400 (Helper text)
Caption: 11px / font-weight: 400 (Timestamps)
```

### Layout

```
Sidebar:  280px (expanded) | 72px (collapsed)
Header:   64px height
Content:  flex-1, padding 24px
Cards:    rounded-xl, shadow-sm, border border-gray-100
```

### Responsive Breakpoints

```
Mobile:   < 768px  → Sidebar becomes drawer (hamburger menu)
Tablet:   768-1024px → Sidebar collapsed (icons only)
Desktop:  > 1024px → Sidebar fully expanded
```

---

## 7. DATABASE SCHEMA (30+ Tables)

### Core Tables

- `tenants` — School entities (multi-tenant root)
- `users` — All users (linked to tenant)
- `roles` — Role definitions
- `permissions` — RBAC permissions (with gender scope)
- `sessions` — Auth sessions
- `audit_logs` — Activity tracking

### Education Tables

- `academic_years`, `terms` — Academic calendar
- `classes`, `sections` — Class/section structure
- `subjects` — Subject catalog
- `schedules` — Timetable entries

### People Tables

- `teachers`, `students`, `parents` — Role-specific profiles
- `parent_student` — Many-to-many relationship

### Feature Tables

- `attendance`, `attendance_settings` — Attendance tracking
- `grades`, `grade_scales` — Grading system
- `exams`, `exam_results` — Exam management
- `assignments`, `assignment_submissions` — Homework
- `payments`, `payment_plans`, `invoices`, `fee_structures` — Finance
- `notices`, `events`, `notifications`, `messages` — Communication
- `ai_conversations`, `ai_insights`, `ai_reports` — AI features

### Critical Constraints

1. **Every table** (except `tenants`) MUST have `tenantId` FK.
2. **Tenant isolation** — All queries MUST filter by `tenantId`.
3. **Gender filtering** — `students.gender` and `teachers.gender` used by `GenderGuard`.
4. **Cascade deletes** — Removing a tenant cascades to all related data.

---

## 8. MULTI-TENANCY RULES (CRITICAL)

This is the most important architectural decision. Violations = security breach.

### Subdomain-Based Tenant Resolution

```typescript
// proxy.ts — runs on EVERY request
// 1. Extract subdomain from host header
// 2. "platform" → Platform Admin routes
// 3. "[slug]" → Lookup tenant by slug → inject tenantId
// 4. No subdomain (talimy.space) → Public/marketing pages
```

### Backend Tenant Middleware

```typescript
// tenant.middleware.ts
// 1. Extract tenantId from JWT token (set during login)
// 2. Verify tenantId matches requested resource
// 3. Inject tenantId into request context
// 4. ALL service methods receive tenantId as first parameter
```

### Rules

1. **NEVER** query data without `WHERE tenantId = ?`.
2. **NEVER** allow cross-tenant data access (even for school_admin).
3. Platform Admin bypasses tenant filter (they see all).
4. JWTs contain `tenantId` — always verify it matches.

---

## 9. GENDER-BASED ACCESS CONTROL

O'zbekiston maktab tizimida gender ajratish mavjud (boys school, girls school, mixed).

### Tenant Gender Policy

```typescript
type GenderPolicy = "boys_only" | "girls_only" | "mixed"
```

### School Admin Scope

```
school_admin_boys  → Can only see/manage male students & male teachers
school_admin_girls → Can only see/manage female students & female teachers
school_admin_all   → Can see/manage all (for mixed schools)
principal          → Full access regardless of gender
```

### Implementation

- `GenderGuard` checks `user.genderScope` against resource's `gender` field.
- Applied to: `GET /students`, `GET /teachers`, `POST /students`, `POST /teachers`.
- Permify handles fine-grained permission checks.

---

## 10. i18n (Internationalization)

### Supported Languages

| Code | Language    | Status   |
| ---- | ----------- | -------- |
| `uz` | O'zbek tili | Default  |
| `tr` | Turk tili   | Default  |
| `en` | English     | Optional |
| `ru` | Русский     | Optional |

### Implementation

- Library: `next-intl` v3.26
- Translation files: `apps/web/src/messages/{uz,tr,en,ru}.json`
- 200+ translation keys covering all UI text
- Language switcher in header
- User preference saved in profile

---

## 11. ENVIRONMENT VARIABLES

```bash
# === Database ===
DATABASE_URL=postgresql://user:pass@host:5432/talimy

# === Auth ===
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://talimy.space
JWT_ACCESS_SECRET=xxx
JWT_REFRESH_SECRET=xxx

# === Redis ===
REDIS_URL=rediss://:PASSWORD@redis.talimy.space:PORT

# === File Storage ===
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=talimy-uploads

# === Email ===
RESEND_API_KEY=xxx

# === SMS ===
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=xxx

# === AI ===
ANTHROPIC_API_KEY=xxx

# === Monitoring ===
SENTRY_DSN=xxx
AXIOM_TOKEN=xxx

# === App ===
NEXT_PUBLIC_APP_URL=https://talimy.space
NEXT_PUBLIC_API_URL=https://api.talimy.space
```

### Env file placement (strict)

- `apps/api/.env`: backend-only secrets and server integrations (`DATABASE_URL`, `REDIS_URL`, `JWT_*`, `R2_*`, `RESEND_*`, `TWILIO_*`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `AXIOM_TOKEN`).
- `apps/web/.env.local`: Next.js web app envs; only expose client-safe vars with `NEXT_PUBLIC_*`.
- `.env.example`: template only, never real secrets.
- Root `.env`: optional; use only for repo-level tooling scripts when explicitly required.
- Agent responses MUST name one exact target file path for each env var (no ambiguous "X yoki Y").

---

## 12. COMMANDS

### Development

```bash
bun run dev                    # Start all apps (web + api)
bun run dev --filter=web       # Start only frontend
bun run dev --filter=api       # Start only backend
```

### Build & Lint

```bash
bun run build                  # Build all packages + apps
bun run lint                   # Lint all
bun run typecheck              # TypeScript check all
bun run format                 # Prettier format all
```

### Database

```bash
bun run db:generate            # Generate Drizzle migrations
bun run db:migrate             # Run migrations
bun run db:seed                # Seed demo data
bun run db:studio              # Open Drizzle Studio
```

### Testing

```bash
bun run test                   # Run all tests
bun run test --filter=api      # Backend tests only
bun run test --filter=web      # Frontend tests only
bun run test:e2e               # Playwright E2E tests
```

---

## 13. PAGES MAP (42+ Pages)

### Public (talimy.space)

```
/                    → Landing page
/pricing             → Pricing plans
/about               → About us
/contact             → Contact form
/features            → Features list
/login               → Login (email/phone + password)
/register            → School registration (multi-step)
/forgot-password     → Password recovery
/reset-password      → Set new password
/verify-email        → Email verification
```

### Platform Admin (platform.talimy.space)

```
/platform/dashboard           → KPI: schools, students, revenue
/platform/dashboard/revenue   → Financial analytics
/platform/dashboard/growth    → Growth metrics
/platform/schools             → Schools DataTable
/platform/schools/new         → Add school form
/platform/schools/[id]        → School detail
/platform/schools/[id]/edit   → Edit school
/platform/settings            → General settings
/platform/settings/billing    → Tariff plans
/platform/settings/security   → Security config
/platform/settings/profile    → Admin profile
```

### School Admin ([school].talimy.space/admin)

```
/admin/dashboard              → KPI: students, attendance, finance
/admin/teachers               → Teachers DataTable
/admin/teachers/new           → Add teacher (stepper)
/admin/teachers/[id]          → Teacher profile
/admin/teachers/[id]/edit     → Edit teacher
/admin/students               → Students DataTable
/admin/students/new           → Add student (stepper)
/admin/students/[id]          → Student profile
/admin/students/[id]/edit     → Edit student
/admin/classes                → Classes grid
/admin/classes/new            → Add class
/admin/classes/[id]           → Class detail
/admin/attendance             → Attendance management
/admin/finance                → Finance overview
/admin/finance/payments       → Payments table
/admin/finance/invoices       → Invoices
/admin/exams                  → Exams list
/admin/exams/new              → Create exam
/admin/exams/[id]             → Exam detail + results
/admin/schedule               → Schedule management
/admin/notices                → Notices list
/admin/notices/new            → Create notice
/admin/calendar               → Events calendar
/admin/profile                → Admin profile
/admin/settings               → School settings
/admin/settings/academic      → Academic year/terms
/admin/settings/grading       → Grade scales
```

### Teacher ([school].talimy.space/teacher)

```
/teacher/dashboard            → KPI + today's schedule
/teacher/students             → My students
/teacher/students/[id]        → Student detail
/teacher/attendance           → Mark attendance
/teacher/assignments          → Assignments list
/teacher/assignments/new      → Create assignment
/teacher/assignments/[id]     → Assignment + submissions
/teacher/grades               → Grade entry
/teacher/exams                → Exams list
/teacher/exams/[id]           → Enter exam results
/teacher/schedule             → My schedule
/teacher/notices              → View notices
/teacher/calendar             → Calendar
/teacher/profile              → My profile
/teacher/settings             → Settings
```

### Student ([school].talimy.space/student)

```
/student/dashboard            → KPI + AI insights
/student/schedule             → My timetable
/student/assignments          → My assignments
/student/assignments/[id]     → Submit assignment
/student/grades               → My grades
/student/exams                → Exam results
/student/exams/[id]           → Exam detail
/student/attendance           → My attendance
/student/notices              → Notices
/student/calendar             → Calendar
/student/profile              → My profile
```

### Parent ([school].talimy.space/parent)

```
/parent/dashboard             → Child overview (grades, attendance, assignments)
/parent/profile               → Parent profile
```

---

## 14. SECURITY CHECKLIST

- [ ] JWT tokens: Access (15min), Refresh (7 days)
- [ ] Password hashing: bcrypt with salt rounds 12
- [ ] Rate limiting: Auth endpoints 5/min, API 100/min
- [ ] Input validation: Zod on ALL inputs (frontend + backend)
- [ ] SQL injection: Drizzle parameterized queries only
- [ ] XSS prevention: React auto-escaping + CSP headers
- [ ] CORS: Whitelist only talimy.space subdomains
- [ ] Helmet: Secure HTTP headers
- [ ] Tenant isolation: Every query filters by tenantId
- [ ] File uploads: Type/size validation, signed URLs only

---

## 15. AGENT WORKFLOW RULES

### Before Writing Code

1. **Read** `AGENTS.md` + `docReja/Documentation.html` + `docReja/Reja.md`
2. **Search** existing codebase for similar patterns before creating new code
3. **Plan** with a task list (max 5 subtasks per batch)

### While Writing Code

1. **One feature at a time**. Complete it fully before moving to the next.
2. **Follow the project tree** in `docReja/Reja.md` exactly.
3. **Reuse** shared packages (`@talimy/ui`, `@talimy/shared`, `@talimy/database`).
4. **Validate** all external data with Zod schemas from `@talimy/shared/validators`.
5. **Test** every endpoint with curl or Vitest after implementing.
6. **Never skip** tenant isolation. Every DB query MUST include `tenantId`.
7. **Minimal-diff editing**: Change only what is required for the task. Do not rewrite unchanged lines.
8. **Surgical updates**: If one prop/value/path changes, edit only that exact part; keep surrounding code untouched.
9. **Post-install verification is agent-owned**: After setup/install steps (e.g., shadcn init/add), the agent MUST verify generated config and paths itself before giving next steps.
10. **Mandatory quick checks after UI setup**: verify `components.json` (`tailwind.css` path), `src/app/globals.css` presence, and TS path aliases (`@/*`, `@talimy/ui/*`) and then report actionable next tasks.
11. **Diff hygiene is mandatory**: when editing a file, change only target lines; unchanged neighboring lines (headers/keys/values) MUST NOT be deleted and re-added. After edits, verify with `git diff --word-diff -- <file>` and ensure only intended tokens changed.
12. **Best-practice first (strict)**: Do NOT choose temporary / pragmatic / quick-fix workarounds as the primary solution. Default to the cleanest, most correct, long-term, best-practice implementation even if it takes longer.
    -11. **Env-path precision is mandatory**: when asking the user to add/update environment variables, the agent MUST provide a single exact file path per variable based on scope (e.g., `apps/api/.env` or `apps/web/.env.local`) and MUST NOT use ambiguous alternatives like "A yoki B".

### After Writing Code

1. Run `bun run lint` and `bun run typecheck` — fix all errors.
2. Test the feature manually (curl for API, browser for UI).
3. Check for security vulnerabilities (OWASP top 10).
4. Update this `AGENTS.md` if new patterns are introduced.

### What NOT To Do

- Do NOT install packages not listed in the tech stack without asking.
- Do NOT change the monorepo structure without asking.
- Do NOT skip Zod validation on any input.
- Do NOT use `any` type anywhere.
- Do NOT make default exports (except Next.js pages).
- Do NOT create component-level CSS files. Keep global styles only in `packages/ui/globals.css` and use Tailwind classes in components.
- Do NOT create/use `apps/web/middleware.ts`; use `apps/web/proxy.ts`.
- Do NOT query database without tenantId filter.
- Do NOT store secrets in code. Use environment variables.
- Do NOT reformat or rewrite unrelated code when making targeted changes.
- Do NOT ship temporary / pragmatic / quick-fix workarounds as final solutions. Use clean, correct, best-practice implementations by default.

---

## 16. FILE NAMING CONVENTIONS

```
# Components
teachers-table.tsx          → export function TeachersTable() {}
teacher-form.tsx            → export function TeacherForm() {}
stat-card.tsx               → export function StatCard() {}

# Pages (Next.js App Router)
page.tsx                    → export default function Page() {}
layout.tsx                  → export default function Layout() {}
loading.tsx                 → export default function Loading() {}
error.tsx                   → "use client"; export default function Error() {}

# Backend (NestJS)
teachers.module.ts          → @Module({ ... })
teachers.controller.ts      → @Controller('teachers')
teachers.service.ts         → @Injectable()
create-teacher.dto.ts       → export class CreateTeacherDto {}

# Database
teachers.ts                 → export const teachers = pgTable(...)

# Types
teacher.ts                  → export type Teacher = { ... }

# Validators
teacher.schema.ts           → export const createTeacherSchema = z.object({...})

# Constants
roles.ts                    → export const ROLES = { ... } as const
```

---

## 17. IMPLEMENTATION ORDER (Follow Strictly)

```
Phase 0:  Monorepo setup (turbo, bun, configs)
Phase 1:  Database (Drizzle schema, migrations, seeds)
Phase 2:  Backend API (NestJS modules, guards, services)
Phase 3:  Frontend infra (Next.js setup, proxy, providers)
Phase 4:  UI components (shadcn/ui + custom components)
Phase 5:  Layouts (app shell, sidebar, header)
Phase 6:  Marketing pages (landing, pricing, about, contact)
Phase 7:  Auth pages (login, register, forgot/reset password)
Phase 8:  Platform Admin (dashboard, schools, settings)
Phase 9:  School Admin (dashboard, teachers, students, classes, attendance, finance, exams)
Phase 10: Teacher panel (dashboard, students, attendance, assignments, grades, exams)
Phase 11: Student panel (dashboard, schedule, assignments, grades, exams, attendance)
Phase 12: Parent panel (dashboard, child overview)
Phase 13: Real-time (Socket.IO, notifications)
Phase 14: AI (Claude integration, insights, reports)
Phase 15: SEO, Performance, Security hardening
Phase 16: Testing (unit, integration, E2E)
Phase 17: CI/CD, Deployment
```

---

## 18. SKILL USAGE RULES

These rules are derived from `docReja/Reja.md` (Phases 15-17) and `docReja/Documentation.html` (CI/CD, deployment, monitoring, security workflows).

### 18.1 Mandatory Triggering

- Use `playwright` for UI flow testing, browser automation, and E2E troubleshooting (Phase 16).
- Use `gh-fix-ci` when GitHub Actions checks fail or CI logs must be analyzed (Phase 17.1).
- Use `vercel-deploy` for web deployment actions to Vercel (Phase 17.1/17.2).
- Use `sentry` when production errors/events or health data from Sentry are requested (Phase 17.3).
- Use `security-best-practices` only when user explicitly asks for security review/guidance (Phase 15).
- Use `screenshot` when user explicitly asks for desktop/system screenshots or when visual proof is needed.

### 18.2 How To Use Skills In This Project

1. Announce in one line which skill is being used and why.
2. Open the skill `SKILL.md` and follow its workflow before taking action.
3. Keep skill usage scoped to the active task/phase; do not invoke unrelated skills.
4. If required env/secrets are missing (e.g., `SENTRY_AUTH_TOKEN`), report the blocker and continue with best fallback.
5. After finishing a skill-driven task, summarize what was checked/changed and next actionable step.

### 18.3 Priority And Fallback

1. Use the minimal set of skills needed for the task.
2. If multiple skills could apply, prioritize the one directly mapped to the request:
   - CI failures -> `gh-fix-ci`
   - UI automation/E2E -> `playwright`
   - Deployment -> `vercel-deploy`
   - Production error triage -> `sentry`
   - Security hardening review -> `security-best-practices`
3. If a skill is unavailable or fails to initialize, state it briefly and continue with manual fallback.

---

## 19. REFERENCE DOCUMENTS

| File                         | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `docReja/Documentation.html` | Full technical analysis (pages, components, DB, API)        |
| `docReja/Reja.md`            | Complete project plan (17 phases, 350+ subtasks, full tree) |
| `AGENTS.md`                  | This file — agent context & rules                           |

---

_Last updated: 2026-02-19_
_Maintained by: Talimy Development Team_
