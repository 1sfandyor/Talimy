import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { users } from "./users"

export const noticePriorityEnum = pgEnum("notice_priority", ["low", "medium", "high", "urgent"])

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    content: varchar("content", { length: 5000 }).notNull(),
    targetRole: varchar("target_role", { length: 30 }).notNull(),
    priority: noticePriorityEnum("priority").notNull().default("medium"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    publishDate: timestamp("publish_date", { withTimezone: true }).notNull().defaultNow(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("notices_tenant_id_idx").on(table.tenantId),
    priorityIdx: index("notices_priority_idx").on(table.priority),
    publishIdx: index("notices_publish_date_idx").on(table.publishDate),
  })
)
