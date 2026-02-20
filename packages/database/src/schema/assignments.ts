import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { subjects } from "./subjects"
import { teachers } from "./teachers"
import { tenants } from "./tenants"

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    totalPoints: integer("total_points").notNull().default(100),
    fileUrl: varchar("file_url", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("assignments_tenant_id_idx").on(table.tenantId),
    teacherIdx: index("assignments_teacher_id_idx").on(table.teacherId),
    classIdx: index("assignments_class_id_idx").on(table.classId),
    dueDateIdx: index("assignments_due_date_idx").on(table.dueDate),
  })
)
