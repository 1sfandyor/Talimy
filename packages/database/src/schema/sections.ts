import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { tenants } from "./tenants"

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 20 }).notNull(),
    maxStudents: integer("max_students").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("sections_tenant_id_idx").on(table.tenantId),
    classIdx: index("sections_class_id_idx").on(table.classId),
  })
)
