import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "inactive", "suspended"])
export const genderPolicyEnum = pgEnum("gender_policy", ["boys_only", "girls_only", "mixed"])
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "basic",
  "pro",
  "enterprise",
])

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  status: tenantStatusEnum("status").notNull().default("active"),
  genderPolicy: genderPolicyEnum("gender_policy").notNull().default("mixed"),
  plan: subscriptionPlanEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})
