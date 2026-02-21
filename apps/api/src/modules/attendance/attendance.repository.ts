import { attendance, classes, db, students, teachers, users } from "@talimy/database"
import {
  and,
  asc,
  between,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { AttendanceQueryDto } from "./dto/attendance-query.dto"
import { MarkAttendanceDto } from "./dto/mark-attendance.dto"
import type { AttendanceItem, AttendanceReport } from "./attendance.types"

@Injectable()
export class AttendanceRepository {
  async mark(payload: MarkAttendanceDto): Promise<{ success: true; affected: number }> {
    await this.assertClassInTenant(payload.tenantId, payload.classId)
    const studentIds = payload.records.map((record) => record.studentId)
    await this.assertStudentsInClass(payload.tenantId, payload.classId, studentIds)

    let affected = 0
    for (const record of payload.records) {
      const [existing] = await db
        .select({ id: attendance.id })
        .from(attendance)
        .where(
          and(
            eq(attendance.tenantId, payload.tenantId),
            eq(attendance.classId, payload.classId),
            eq(attendance.studentId, record.studentId),
            eq(attendance.date, payload.date),
            isNull(attendance.deletedAt)
          )
        )
        .limit(1)

      if (existing) {
        await db
          .update(attendance)
          .set({
            status: record.status,
            note: record.note ?? null,
            markedBy: payload.markedBy ?? null,
            updatedAt: new Date(),
          })
          .where(eq(attendance.id, existing.id))
      } else {
        await db.insert(attendance).values({
          tenantId: payload.tenantId,
          classId: payload.classId,
          studentId: record.studentId,
          date: payload.date,
          status: record.status,
          note: record.note ?? null,
          markedBy: payload.markedBy ?? null,
        })
      }
      affected += 1
    }

    return { success: true, affected }
  }

  async getByClass(tenantId: string, classId: string, query: AttendanceQueryDto) {
    await this.assertClassInTenant(tenantId, classId)
    const filters = this.buildFilters(tenantId, { ...query, classId, studentId: undefined })
    return this.listWithMeta(filters, query)
  }

  async getByStudent(tenantId: string, studentId: string, query: AttendanceQueryDto) {
    await this.assertStudentInTenant(tenantId, studentId)
    const filters = this.buildFilters(tenantId, { ...query, studentId })
    return this.listWithMeta(filters, query)
  }

  async report(query: AttendanceQueryDto): Promise<AttendanceReport> {
    const filters = this.buildFilters(query.tenantId, query)

    const totalsRows = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(...filters))
      .groupBy(attendance.status)

    const totals = { present: 0, absent: 0, late: 0, excused: 0, all: 0 }
    for (const row of totalsRows) {
      totals[row.status] = row.count
      totals.all += row.count
    }

    const byDayRows = await db
      .select({
        date: attendance.date,
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(...filters))
      .groupBy(attendance.date, attendance.status)
      .orderBy(asc(attendance.date))

    const byDayMap = new Map<
      string,
      { date: string; present: number; absent: number; late: number; excused: number; all: number }
    >()
    for (const row of byDayRows) {
      const key = row.date
      const current = byDayMap.get(key) ?? {
        date: row.date,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        all: 0,
      }
      current[row.status] = row.count
      current.all += row.count
      byDayMap.set(key, current)
    }

    return {
      period: { from: query.dateFrom ?? null, to: query.dateTo ?? null },
      totals,
      byDay: Array.from(byDayMap.values()),
    }
  }

  private async listWithMeta(
    filters: SQL[],
    query: AttendanceQueryDto
  ): Promise<{
    data: AttendanceItem[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(classes, eq(classes.id, attendance.classId))
      .where(and(...filters))
    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select({
        id: attendance.id,
        studentId: students.id,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentCode: students.studentId,
        classId: classes.id,
        className: classes.name,
        date: attendance.date,
        status: attendance.status,
        note: attendance.note,
        markedBy: attendance.markedBy,
      })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(classes, eq(classes.id, attendance.classId))
      .where(and(...filters))
      .orderBy(desc(attendance.date), asc(users.firstName), asc(users.lastName))
      .limit(query.limit)
      .offset(offset)

    const teacherIds = rows.map((row) => row.markedBy).filter((v): v is string => Boolean(v))
    const teachersMap = new Map<string, string>()
    if (teacherIds.length > 0) {
      const teacherRows = await db
        .select({
          id: teachers.id,
          name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(teachers)
        .innerJoin(users, eq(users.id, teachers.userId))
        .where(
          and(inArray(teachers.id, teacherIds), isNull(teachers.deletedAt), isNull(users.deletedAt))
        )
      for (const row of teacherRows) teachersMap.set(row.id, row.name)
    }

    return {
      data: rows.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        studentCode: row.studentCode,
        classId: row.classId,
        className: row.className,
        date: row.date,
        status: row.status,
        note: row.note,
        markedBy: row.markedBy,
        markedByName: row.markedBy ? (teachersMap.get(row.markedBy) ?? null) : null,
      })),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  private buildFilters(tenantId: string, query: AttendanceQueryDto): SQL[] {
    const filters: SQL[] = [eq(attendance.tenantId, tenantId), isNull(attendance.deletedAt)]
    if (query.classId) filters.push(eq(attendance.classId, query.classId))
    if (query.studentId) filters.push(eq(attendance.studentId, query.studentId))
    if (query.status) filters.push(eq(attendance.status, query.status))
    if (query.dateFrom && query.dateTo) {
      filters.push(between(attendance.date, query.dateFrom, query.dateTo))
    } else if (query.dateFrom) {
      filters.push(gte(attendance.date, query.dateFrom))
    } else if (query.dateTo) {
      filters.push(lte(attendance.date, query.dateTo))
    }
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(students.studentId, `%${search}%`),
            ilike(classes.name, `%${search}%`)
          )!
        )
      }
    }
    return filters
  }

  private async assertClassInTenant(tenantId: string, classId: string): Promise<void> {
    const [row] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Class not found in tenant")
  }

  private async assertStudentInTenant(tenantId: string, studentId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(eq(students.id, studentId), eq(students.tenantId, tenantId), isNull(students.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Student not found in tenant")
  }

  private async assertStudentsInClass(
    tenantId: string,
    classId: string,
    studentIds: string[]
  ): Promise<void> {
    if (studentIds.length === 0) throw new BadRequestException("records cannot be empty")

    const rows = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.classId, classId),
          inArray(students.id, studentIds),
          isNull(students.deletedAt)
        )
      )
    if (rows.length !== studentIds.length) {
      throw new BadRequestException("One or more students do not belong to this class")
    }
  }
}
