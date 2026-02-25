import { aiInsights, attendance, db, grades, students, users } from "@talimy/database"
import { and, avg, count, desc, eq, isNull, sql } from "drizzle-orm"
import { Injectable, NotFoundException } from "@nestjs/common"

import type { StudentInsightRow } from "./ai.types"

@Injectable()
export class AiRepository {
  async getStudentForInsights(tenantId: string, studentId: string) {
    const [student] = await db
      .select({
        id: students.id,
        tenantId: students.tenantId,
        studentCode: students.studentId,
        status: students.status,
        gender: students.gender,
        enrollmentDate: students.enrollmentDate,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(
        and(
          eq(students.id, studentId),
          eq(students.tenantId, tenantId),
          isNull(students.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    if (!student) throw new NotFoundException("Student not found")
    return { ...student, enrollmentDate: student.enrollmentDate ?? null }
  }

  async listExistingInsights(tenantId: string, studentId: string, type?: string) {
    const filters = [
      eq(aiInsights.tenantId, tenantId),
      eq(aiInsights.studentId, studentId),
      isNull(aiInsights.deletedAt),
      type ? eq(aiInsights.type, type) : undefined,
    ].filter((v): v is NonNullable<typeof v> => Boolean(v))

    return db
      .select({
        id: aiInsights.id,
        tenantId: aiInsights.tenantId,
        studentId: aiInsights.studentId,
        type: aiInsights.type,
        content: aiInsights.content,
        confidence: aiInsights.confidence,
        generatedAt: aiInsights.generatedAt,
        createdAt: aiInsights.createdAt,
        updatedAt: aiInsights.updatedAt,
      })
      .from(aiInsights)
      .where(and(...filters))
      .orderBy(desc(aiInsights.generatedAt))
      .limit(5)
  }

  async getStudentAggregates(tenantId: string, studentId: string) {
    const [gradeAgg] = await db
      .select({ count: count(grades.id), averageScore: avg(grades.score) })
      .from(grades)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.studentId, studentId),
          isNull(grades.deletedAt)
        )
      )

    const [attendanceAgg] = await db
      .select({
        total: count(attendance.id),
        absentCount: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'absent')::int`.as(
          "absent_count"
        ),
        lateCount: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'late')::int`.as(
          "late_count"
        ),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.studentId, studentId),
          isNull(attendance.deletedAt)
        )
      )

    return {
      gradeCount: gradeAgg?.count ?? 0,
      averageScore: gradeAgg?.averageScore ?? null,
      attendanceTotal: attendanceAgg?.total ?? 0,
      absentCount: attendanceAgg?.absentCount ?? 0,
      lateCount: attendanceAgg?.lateCount ?? 0,
    }
  }

  async getTenantReportStats(tenantId: string) {
    const [studentCountRow] = await db
      .select({ total: count(students.id) })
      .from(students)
      .where(and(eq(students.tenantId, tenantId), isNull(students.deletedAt)))
    const [gradeCountRow] = await db
      .select({ total: count(grades.id), averageScore: avg(grades.score) })
      .from(grades)
      .where(and(eq(grades.tenantId, tenantId), isNull(grades.deletedAt)))
    const [attendanceCountRow] = await db
      .select({ total: count(attendance.id) })
      .from(attendance)
      .where(and(eq(attendance.tenantId, tenantId), isNull(attendance.deletedAt)))

    return {
      students: studentCountRow?.total ?? 0,
      grades: gradeCountRow?.total ?? 0,
      averageScore: gradeCountRow?.averageScore ?? null,
      attendanceRecords: attendanceCountRow?.total ?? 0,
    }
  }
}
