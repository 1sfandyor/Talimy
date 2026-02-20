import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { roles } from "./roles"
import { tenants } from "./tenants"

export const permissionActionEnum = pgEnum("permission_action", [
  "create",
  "read",
  "update",
  "delete",
  "manage",
])
export const permissionGenderScopeEnum = pgEnum("permission_gender_scope", [
  "all",
  "boys_only",
  "girls_only",
])

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    resource: varchar("resource", { length: 100 }).notNull(),
    action: permissionActionEnum("action").notNull(),
    genderScope: permissionGenderScopeEnum("gender_scope").notNull().default("all"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    roleIdx: index("permissions_role_id_idx").on(table.roleId),
    tenantIdx: index("permissions_tenant_id_idx").on(table.tenantId),
    resourceIdx: index("permissions_resource_idx").on(table.resource),
  })
)
