import type { classes } from "@talimy/database"

import type { ClassView } from "./classes.types"

export function toClassView(row: typeof classes.$inferSelect, studentsCount: number): ClassView {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    grade: row.grade,
    section: row.section,
    capacity: row.capacity,
    academicYearId: row.academicYearId,
    studentsCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
