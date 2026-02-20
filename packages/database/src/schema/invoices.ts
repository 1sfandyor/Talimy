import { date, index, jsonb, numeric, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { students } from "./students"
import { tenants } from "./tenants"

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "cancelled",
])

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    items: jsonb("items").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("issued"),
    issuedDate: date("issued_date").notNull(),
    dueDate: date("due_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("invoices_tenant_id_idx").on(table.tenantId),
    studentIdx: index("invoices_student_id_idx").on(table.studentId),
    statusIdx: index("invoices_status_idx").on(table.status),
    dueDateIdx: index("invoices_due_date_idx").on(table.dueDate),
  })
)
