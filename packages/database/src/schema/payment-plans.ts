import { date, index, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { feeStructures } from "./fee-structures"
import { students } from "./students"
import { tenants } from "./tenants"

export const paymentPlans = pgTable(
  "payment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    feeStructureId: uuid("fee_structure_id")
      .notNull()
      .references(() => feeStructures.id, { onDelete: "cascade" }),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    dueDate: date("due_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("payment_plans_tenant_id_idx").on(table.tenantId),
    studentIdx: index("payment_plans_student_id_idx").on(table.studentId),
    feeStructureIdx: index("payment_plans_fee_structure_id_idx").on(table.feeStructureId),
    dueDateIdx: index("payment_plans_due_date_idx").on(table.dueDate),
  })
)
