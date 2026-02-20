import { index, numeric, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const gradeScales = pgTable(
  "grade_scales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    minScore: numeric("min_score", { precision: 5, scale: 2 }).notNull(),
    maxScore: numeric("max_score", { precision: 5, scale: 2 }).notNull(),
    grade: varchar("grade", { length: 10 }).notNull(),
    gpa: numeric("gpa", { precision: 4, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("grade_scales_tenant_id_idx").on(table.tenantId),
    gradeIdx: index("grade_scales_grade_idx").on(table.grade),
  })
)
