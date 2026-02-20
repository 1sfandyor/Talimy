import { index, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { exams } from "./exams"
import { students } from "./students"
import { tenants } from "./tenants"

export const examResults = pgTable(
  "exam_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    grade: varchar("grade", { length: 10 }),
    rank: varchar("rank", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("exam_results_tenant_id_idx").on(table.tenantId),
    examIdx: index("exam_results_exam_id_idx").on(table.examId),
    studentIdx: index("exam_results_student_id_idx").on(table.studentId),
  })
)
