import { assignmentSubmissions, assignments, attendance, db, grades } from "@talimy/database"
import { and, eq, isNull, sql } from "drizzle-orm"
import { Injectable } from "@nestjs/common"

import { createEmptyStudentSummary } from "./students.mapper"
import { StudentsRepository } from "./students.repository"
import type { StudentSummary } from "./students.types"

@Injectable()
export class StudentsSummaryRepository {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async getSummary(tenantId: string, id: string): Promise<StudentSummary> {
    const studentRow = await this.studentsRepository.findStudentRowOrThrow(tenantId, id)
    const summary = createEmptyStudentSummary()

    const gradeRows = await db
      .select({
        count: sql<number>`count(*)::int`,
        avg: sql<string>`coalesce(avg(${grades.score}), 0)`,
      })
      .from(grades)
      .where(and(eq(grades.tenantId, tenantId), eq(grades.studentId, id), isNull(grades.deletedAt)))
    summary.gradesCount = gradeRows[0]?.count ?? 0
    summary.gradeAverage = Number(gradeRows[0]?.avg ?? "0")

    const attendanceRows = await db
      .select({ status: attendance.status, count: sql<number>`count(*)::int` })
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.studentId, id),
          isNull(attendance.deletedAt)
        )
      )
      .groupBy(attendance.status)
    for (const row of attendanceRows) {
      summary.attendance[row.status] = row.count
    }

    if (studentRow.student.classId) {
      const assignmentRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assignments)
        .where(
          and(
            eq(assignments.tenantId, tenantId),
            eq(assignments.classId, studentRow.student.classId),
            isNull(assignments.deletedAt)
          )
        )
      summary.assignments.total = assignmentRows[0]?.count ?? 0
    }

    const submissionRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.tenantId, tenantId),
          eq(assignmentSubmissions.studentId, id),
          isNull(assignmentSubmissions.deletedAt)
        )
      )
    summary.assignments.submitted = submissionRows[0]?.count ?? 0
    summary.assignments.pending = Math.max(
      0,
      summary.assignments.total - summary.assignments.submitted
    )

    return summary
  }
}
