import { date, index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { tenants } from "./tenants"
import { users } from "./users"

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "inactive",
  "graduated",
  "transferred",
])

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: varchar("student_id", { length: 50 }).notNull(),
    gender: varchar("gender", { length: 10 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    enrollmentDate: date("enrollment_date").notNull(),
    status: studentStatusEnum("status").notNull().default("active"),
    bloodGroup: varchar("blood_group", { length: 8 }),
    address: varchar("address", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("students_tenant_id_idx").on(table.tenantId),
    userIdx: index("students_user_id_idx").on(table.userId),
    classIdx: index("students_class_id_idx").on(table.classId),
    studentCodeIdx: index("students_student_id_idx").on(table.studentId),
  })
)
