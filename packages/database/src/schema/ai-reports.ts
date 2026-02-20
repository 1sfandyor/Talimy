import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { users } from "./users"

export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    parameters: jsonb("parameters"),
    result: jsonb("result"),
    generatedBy: uuid("generated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("ai_reports_tenant_id_idx").on(table.tenantId),
    typeIdx: index("ai_reports_type_idx").on(table.type),
    generatedByIdx: index("ai_reports_generated_by_idx").on(table.generatedBy),
  })
)
