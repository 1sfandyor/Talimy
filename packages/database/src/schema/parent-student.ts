import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { parents } from "./parents"
import { students } from "./students"
import { tenants } from "./tenants"

export const parentStudent = pgTable(
  "parent_student",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("parent_student_tenant_id_idx").on(table.tenantId),
    parentIdx: index("parent_student_parent_id_idx").on(table.parentId),
    studentIdx: index("parent_student_student_id_idx").on(table.studentId),
  })
)
