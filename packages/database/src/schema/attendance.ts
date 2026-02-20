import { date, index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { students } from "./students"
import { teachers } from "./teachers"
import { tenants } from "./tenants"

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
])

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    markedBy: uuid("marked_by").references(() => teachers.id, { onDelete: "set null" }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("attendance_tenant_id_idx").on(table.tenantId),
    studentIdx: index("attendance_student_id_idx").on(table.studentId),
    classIdx: index("attendance_class_id_idx").on(table.classId),
    dateIdx: index("attendance_date_idx").on(table.date),
  })
)
