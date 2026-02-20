import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const eventTypeEnum = pgEnum("event_type", [
  "academic",
  "exam",
  "holiday",
  "sports",
  "other",
])

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    type: eventTypeEnum("type").notNull().default("other"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("events_tenant_id_idx").on(table.tenantId),
    typeIdx: index("events_type_idx").on(table.type),
    startIdx: index("events_start_date_idx").on(table.startDate),
  })
)
