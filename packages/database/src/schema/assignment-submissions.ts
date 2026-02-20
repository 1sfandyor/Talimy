import { index, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { assignments } from "./assignments"
import { students } from "./students"
import { tenants } from "./tenants"

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    fileUrl: varchar("file_url", { length: 500 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    score: numeric("score", { precision: 5, scale: 2 }),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("assignment_submissions_tenant_id_idx").on(table.tenantId),
    assignmentIdx: index("assignment_submissions_assignment_id_idx").on(table.assignmentId),
    studentIdx: index("assignment_submissions_student_id_idx").on(table.studentId),
  })
)
