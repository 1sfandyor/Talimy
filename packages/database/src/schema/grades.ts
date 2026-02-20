import { index, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { students } from "./students"
import { subjects } from "./subjects"
import { teachers } from "./teachers"
import { tenants } from "./tenants"
import { terms } from "./terms"

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    grade: varchar("grade", { length: 10 }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("grades_tenant_id_idx").on(table.tenantId),
    studentIdx: index("grades_student_id_idx").on(table.studentId),
    subjectIdx: index("grades_subject_id_idx").on(table.subjectId),
    termIdx: index("grades_term_id_idx").on(table.termId),
  })
)
