import { boolean, index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const attendanceSettings = pgTable(
  "attendance_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    lateThreshold: integer("late_threshold").notNull().default(10),
    absentAlertThreshold: integer("absent_alert_threshold").notNull().default(3),
    autoNotifyParent: boolean("auto_notify_parent").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("attendance_settings_tenant_id_idx").on(table.tenantId),
  })
)
