import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { academicYears } from "./academic-years"
import { tenants } from "./tenants"

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    grade: varchar("grade", { length: 20 }).notNull(),
    section: varchar("section", { length: 20 }),
    capacity: integer("capacity").notNull().default(30),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("classes_tenant_id_idx").on(table.tenantId),
    yearIdx: index("classes_academic_year_id_idx").on(table.academicYearId),
    gradeIdx: index("classes_grade_idx").on(table.grade),
  })
)
