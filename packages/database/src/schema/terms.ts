import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { academicYears } from "./academic-years"
import { tenants } from "./tenants"

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    termNumber: integer("term_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("terms_tenant_id_idx").on(table.tenantId),
    yearIdx: index("terms_academic_year_id_idx").on(table.academicYearId),
    numberIdx: index("terms_term_number_idx").on(table.termNumber),
  })
)
