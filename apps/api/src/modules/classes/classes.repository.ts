import {
  academicYears,
  classes,
  db,
  schedules,
  students,
  subjects,
  teachers,
  users,
} from "@talimy/database"
import { and, asc, desc, eq, ilike, inArray, isNull, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateClassDto } from "./dto/create-class.dto"
import { ListClassesQueryDto } from "./dto/list-classes-query.dto"
import { UpdateClassDto } from "./dto/update-class.dto"
import { toClassView } from "./classes.mapper"
import type {
  ClassScheduleItem,
  ClassStatsView,
  ClassStudentView,
  ClassTeacherView,
  ClassView,
} from "./classes.types"

@Injectable()
export class ClassesRepository {
  async list(query: ListClassesQueryDto): Promise<{
    data: ClassView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(classes.tenantId, query.tenantId), isNull(classes.deletedAt)]
    if (query.grade) filters.push(eq(classes.grade, query.grade))
    if (query.section) filters.push(eq(classes.section, query.section))
    if (query.academicYearId) filters.push(eq(classes.academicYearId, query.academicYearId))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(ilike(classes.name, `%${search}%`))
      }
    }

    const whereExpr = and(...filters)
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(classes)
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select()
      .from(classes)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    const classIds = rows.map((row) => row.id)
    const studentCounts = classIds.length
      ? await db
          .select({
            classId: students.classId,
            count: sql<number>`count(*)::int`,
          })
          .from(students)
          .where(
            and(
              eq(students.tenantId, query.tenantId),
              isNull(students.deletedAt),
              inArray(students.classId, classIds)
            )
          )
          .groupBy(students.classId)
      : []
    const countByClassId = new Map<string, number>()
    for (const row of studentCounts) {
      if (row.classId) countByClassId.set(row.classId, row.count)
    }

    return {
      data: rows.map((row) => toClassView(row, countByClassId.get(row.id) ?? 0)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, id: string): Promise<ClassView> {
    const row = await this.findClassOrThrow(tenantId, id)
    const studentsCount = await this.getStudentsCount(tenantId, id)
    return toClassView(row, studentsCount)
  }

  async create(payload: CreateClassDto): Promise<ClassView> {
    await this.assertAcademicYearInTenant(payload.tenantId, payload.academicYearId)
    const [created] = await db
      .insert(classes)
      .values({
        tenantId: payload.tenantId,
        name: payload.name,
        grade: payload.grade,
        section: payload.section ?? null,
        capacity: payload.capacity,
        academicYearId: payload.academicYearId,
      })
      .returning()
    if (!created) throw new BadRequestException("Failed to create class")
    return toClassView(created, 0)
  }

  async update(tenantId: string, id: string, payload: UpdateClassDto): Promise<ClassView> {
    await this.findClassOrThrow(tenantId, id)
    if (payload.academicYearId) {
      await this.assertAcademicYearInTenant(tenantId, payload.academicYearId)
    }

    const updatePayload: Partial<typeof classes.$inferInsert> = { updatedAt: new Date() }
    if (payload.name) updatePayload.name = payload.name
    if (payload.grade) updatePayload.grade = payload.grade
    if (typeof payload.section !== "undefined") updatePayload.section = payload.section
    if (typeof payload.capacity === "number") updatePayload.capacity = payload.capacity
    if (payload.academicYearId) updatePayload.academicYearId = payload.academicYearId

    const [updated] = await db
      .update(classes)
      .set(updatePayload)
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
      .returning()
    if (!updated) throw new NotFoundException("Class not found")
    const studentsCount = await this.getStudentsCount(tenantId, id)
    return toClassView(updated, studentsCount)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findClassOrThrow(tenantId, id)
    await db
      .update(classes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
    return { success: true }
  }

  async getStudents(tenantId: string, id: string): Promise<ClassStudentView[]> {
    await this.findClassOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: students.id,
        firstName: users.firstName,
        lastName: users.lastName,
        studentId: students.studentId,
        gender: students.gender,
        status: students.status,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.classId, id),
          isNull(students.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .orderBy(asc(users.firstName), asc(users.lastName))
    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      studentId: row.studentId,
      gender: row.gender as "male" | "female",
      status: row.status,
    }))
  }

  async getTeachers(tenantId: string, id: string): Promise<ClassTeacherView[]> {
    await this.findClassOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: teachers.id,
        firstName: users.firstName,
        lastName: users.lastName,
        employeeId: teachers.employeeId,
        subjectCount: sql<number>`count(distinct ${schedules.subjectId})::int`,
      })
      .from(schedules)
      .innerJoin(teachers, eq(teachers.id, schedules.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.classId, id),
          isNull(schedules.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .groupBy(teachers.id, users.firstName, users.lastName, teachers.employeeId)
      .orderBy(asc(users.firstName), asc(users.lastName))

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      employeeId: row.employeeId,
      subjectCount: row.subjectCount,
    }))
  }

  async getSchedule(tenantId: string, id: string): Promise<ClassScheduleItem[]> {
    await this.findClassOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: schedules.id,
        subjectId: subjects.id,
        subjectName: subjects.name,
        teacherId: teachers.id,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        room: schedules.room,
      })
      .from(schedules)
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .innerJoin(teachers, eq(teachers.id, schedules.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.classId, id),
          isNull(schedules.deletedAt),
          isNull(subjects.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime))

    return rows.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      teacherId: row.teacherId,
      teacherName: `${row.teacherFirstName} ${row.teacherLastName}`.trim(),
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
    }))
  }

  async getStats(tenantId: string, id: string): Promise<ClassStatsView> {
    const classRow = await this.findClassOrThrow(tenantId, id)
    const studentsCount = await this.getStudentsCount(tenantId, id)

    const teacherRows = await db
      .select({ teachersCount: sql<number>`count(distinct ${schedules.teacherId})::int` })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.classId, id),
          isNull(schedules.deletedAt)
        )
      )
    const schedulesRows = await db
      .select({ schedulesCount: sql<number>`count(*)::int` })
      .from(schedules)
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.classId, id),
          isNull(schedules.deletedAt)
        )
      )

    const teachersCount = teacherRows[0]?.teachersCount ?? 0
    const schedulesCount = schedulesRows[0]?.schedulesCount ?? 0
    const capacityUsagePercent =
      classRow.capacity > 0 ? Math.round((studentsCount / classRow.capacity) * 100) : 0

    return {
      classId: classRow.id,
      studentsCount,
      teachersCount,
      schedulesCount,
      capacity: classRow.capacity,
      capacityUsagePercent,
    }
  }

  private async findClassOrThrow(
    tenantId: string,
    classId: string
  ): Promise<typeof classes.$inferSelect> {
    const [row] = await db
      .select()
      .from(classes)
      .where(
        and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Class not found")
    return row
  }

  private async assertAcademicYearInTenant(
    tenantId: string,
    academicYearId: string
  ): Promise<void> {
    const [row] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(
        and(
          eq(academicYears.id, academicYearId),
          eq(academicYears.tenantId, tenantId),
          isNull(academicYears.deletedAt)
        )
      )
      .limit(1)
    if (!row) throw new BadRequestException("Academic year not found in tenant")
  }

  private async getStudentsCount(tenantId: string, classId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.classId, classId),
          isNull(students.deletedAt)
        )
      )
    return rows[0]?.count ?? 0
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "name":
        return classes.name
      case "grade":
        return classes.grade
      case "capacity":
        return classes.capacity
      case "updatedAt":
        return classes.updatedAt
      case "createdAt":
      default:
        return classes.createdAt
    }
  }
}
