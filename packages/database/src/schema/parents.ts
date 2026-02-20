import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { users } from "./users"

export const parents = pgTable(
  "parents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 30 }),
    occupation: varchar("occupation", { length: 150 }),
    address: varchar("address", { length: 500 }),
    relationship: varchar("relationship", { length: 50 }).notNull().default("parent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("parents_tenant_id_idx").on(table.tenantId),
    userIdx: index("parents_user_id_idx").on(table.userId),
  })
)
