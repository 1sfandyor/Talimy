import { index, pgEnum, pgTable, time, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { classes } from "./classes"
import { subjects } from "./subjects"
import { tenants } from "./tenants"

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").notNull(),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    room: varchar("room", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("schedules_tenant_id_idx").on(table.tenantId),
    classIdx: index("schedules_class_id_idx").on(table.classId),
    subjectIdx: index("schedules_subject_id_idx").on(table.subjectId),
    teacherIdx: index("schedules_teacher_id_idx").on(table.teacherId),
    dayIdx: index("schedules_day_of_week_idx").on(table.dayOfWeek),
  })
)
