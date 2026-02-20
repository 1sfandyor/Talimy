import { index, numeric, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { tenants } from "./tenants"

export const feeFrequencyEnum = pgEnum("fee_frequency", ["monthly", "termly", "yearly"])

export const feeStructures = pgTable(
  "fee_structures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    frequency: feeFrequencyEnum("frequency").notNull().default("monthly"),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    description: varchar("description", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("fee_structures_tenant_id_idx").on(table.tenantId),
    classIdx: index("fee_structures_class_id_idx").on(table.classId),
  })
)
