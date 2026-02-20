import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { subjects } from "./subjects"
import { tenants } from "./tenants"

export const examTypeEnum = pgEnum("exam_type", ["midterm", "final", "quiz", "custom"])

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    type: examTypeEnum("type").notNull(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalMarks: integer("total_marks").notNull().default(100),
    duration: integer("duration").notNull().default(60),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("exams_tenant_id_idx").on(table.tenantId),
    classIdx: index("exams_class_id_idx").on(table.classId),
    subjectIdx: index("exams_subject_id_idx").on(table.subjectId),
    dateIdx: index("exams_date_idx").on(table.date),
  })
)
