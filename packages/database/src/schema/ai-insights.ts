import { index, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { students } from "./students"
import { tenants } from "./tenants"

export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    content: varchar("content", { length: 5000 }).notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("ai_insights_tenant_id_idx").on(table.tenantId),
    studentIdx: index("ai_insights_student_id_idx").on(table.studentId),
    typeIdx: index("ai_insights_type_idx").on(table.type),
  })
)
