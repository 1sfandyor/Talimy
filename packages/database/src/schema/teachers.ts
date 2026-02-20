import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { users } from "./users"

export const teacherStatusEnum = pgEnum("teacher_status", ["active", "inactive", "on_leave"])

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id", { length: 50 }).notNull(),
    gender: varchar("gender", { length: 10 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    joinDate: date("join_date").notNull(),
    qualification: varchar("qualification", { length: 255 }),
    specialization: varchar("specialization", { length: 255 }),
    salary: numeric("salary", { precision: 12, scale: 2 }),
    status: teacherStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("teachers_tenant_id_idx").on(table.tenantId),
    userIdx: index("teachers_user_id_idx").on(table.userId),
    employeeIdx: index("teachers_employee_id_idx").on(table.employeeId),
  })
)
