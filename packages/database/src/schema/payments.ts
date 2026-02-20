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
import { students } from "./students"
import { tenants } from "./tenants"

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "failed"])

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: varchar("method", { length: 50 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    date: date("date").notNull(),
    receiptNumber: varchar("receipt_number", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("payments_tenant_id_idx").on(table.tenantId),
    studentIdx: index("payments_student_id_idx").on(table.studentId),
    statusIdx: index("payments_status_idx").on(table.status),
    dateIdx: index("payments_date_idx").on(table.date),
  })
)
