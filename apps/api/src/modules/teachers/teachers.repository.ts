import { classes, db, schedules, subjects, teachers, users } from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { ListTeachersQueryDto } from "./dto/list-teachers-query.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"
import { toTeacherView } from "./teachers.mapper"
import type { TeacherScheduleItem, TeacherView } from "./teachers.types"

@Injectable()
export class TeachersRepository {
  async list(query: ListTeachersQueryDto): Promise<{
    data: TeacherView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(teachers.tenantId, query.tenantId), isNull(teachers.deletedAt)]
    if (query.gender) filters.push(eq(teachers.gender, query.gender))
    if (query.status) filters.push(eq(teachers.status, query.status))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(teachers.employeeId, `%${search}%`),
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )!
        )
      }
    }

    const whereExpr = and(...filters)
    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0

    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const rows = await db
      .select({ teacher: teachers, user: users })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => toTeacherView(row.teacher, row.user)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, id: string): Promise<TeacherView> {
    const row = await this.findTeacherRowOrThrow(tenantId, id)
    return toTeacherView(row.teacher, row.user)
  }

  async create(payload: CreateTeacherDto): Promise<TeacherView> {
    const user = await this.findUserOrThrow(payload.tenantId, payload.userId)
    await this.assertUniqueEmployeeId(payload.tenantId, payload.employeeId)
    await this.assertUserNotTeacher(payload.tenantId, payload.userId)

    const [created] = await db
      .insert(teachers)
      .values({
        tenantId: payload.tenantId,
        userId: payload.userId,
        employeeId: payload.employeeId,
        gender: payload.gender,
        joinDate: payload.joinDate,
        dateOfBirth: payload.dateOfBirth,
        qualification: payload.qualification,
        specialization: payload.specialization,
        salary: typeof payload.salary === "number" ? String(payload.salary) : null,
        status: payload.status ?? "active",
      })
      .returning()
    if (!created) throw new BadRequestException("Failed to create teacher")
    return toTeacherView(created, user)
  }

  async update(tenantId: string, id: string, payload: UpdateTeacherDto): Promise<TeacherView> {
    const current = await this.findTeacherRowOrThrow(tenantId, id)
    if (payload.employeeId && payload.employeeId !== current.teacher.employeeId) {
      await this.assertUniqueEmployeeId(tenantId, payload.employeeId, id)
    }

    const updatePayload: Partial<typeof teachers.$inferInsert> = { updatedAt: new Date() }
    if (payload.employeeId) updatePayload.employeeId = payload.employeeId
    if (payload.gender) updatePayload.gender = payload.gender
    if (payload.joinDate) updatePayload.joinDate = payload.joinDate
    if (typeof payload.dateOfBirth !== "undefined") updatePayload.dateOfBirth = payload.dateOfBirth
    if (typeof payload.qualification !== "undefined")
      updatePayload.qualification = payload.qualification
    if (typeof payload.specialization !== "undefined")
      updatePayload.specialization = payload.specialization
    if (typeof payload.salary === "number") updatePayload.salary = String(payload.salary)
    if (payload.status) updatePayload.status = payload.status

    const [updated] = await db
      .update(teachers)
      .set(updatePayload)
      .where(and(eq(teachers.id, id), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt)))
      .returning()
    if (!updated) throw new NotFoundException("Teacher not found")
    return toTeacherView(updated, current.user)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findTeacherRowOrThrow(tenantId, id)
    await db
      .update(teachers)
      .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(teachers.id, id), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt)))
    return { success: true }
  }

  async getSchedule(tenantId: string, id: string): Promise<TeacherScheduleItem[]> {
    await this.findTeacherRowOrThrow(tenantId, id)
    return db
      .select({
        id: schedules.id,
        classId: classes.id,
        className: classes.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        room: schedules.room,
      })
      .from(schedules)
      .innerJoin(classes, eq(classes.id, schedules.classId))
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.teacherId, id),
          isNull(schedules.deletedAt),
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt)
        )
      )
      .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime))
  }

  async getClasses(tenantId: string, id: string): Promise<Array<{ id: string; name: string }>> {
    await this.findTeacherRowOrThrow(tenantId, id)
    return db
      .select({ id: classes.id, name: classes.name })
      .from(schedules)
      .innerJoin(classes, eq(classes.id, schedules.classId))
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.teacherId, id),
          isNull(schedules.deletedAt),
          isNull(classes.deletedAt)
        )
      )
      .groupBy(classes.id, classes.name)
      .orderBy(asc(classes.name))
  }

  async getSubjects(tenantId: string, id: string): Promise<Array<{ id: string; name: string }>> {
    await this.findTeacherRowOrThrow(tenantId, id)
    return db
      .select({ id: subjects.id, name: subjects.name })
      .from(schedules)
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.teacherId, id),
          isNull(schedules.deletedAt),
          isNull(subjects.deletedAt)
        )
      )
      .groupBy(subjects.id, subjects.name)
      .orderBy(asc(subjects.name))
  }

  private async findTeacherRowOrThrow(
    tenantId: string,
    teacherId: string
  ): Promise<{ teacher: typeof teachers.$inferSelect; user: typeof users.$inferSelect }> {
    const [row] = await db
      .select({ teacher: teachers, user: users })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(eq(teachers.id, teacherId), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Teacher not found")
    return row
  }

  private async findUserOrThrow(
    tenantId: string,
    userId: string
  ): Promise<typeof users.$inferSelect> {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Teacher user account not found in tenant")
    return row
  }

  private async assertUniqueEmployeeId(
    tenantId: string,
    employeeId: string,
    ignoreTeacherId?: string
  ): Promise<void> {
    const filters: SQL[] = [
      eq(teachers.tenantId, tenantId),
      eq(teachers.employeeId, employeeId),
      isNull(teachers.deletedAt),
    ]
    if (ignoreTeacherId) filters.push(ne(teachers.id, ignoreTeacherId))
    const [existing] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(and(...filters))
      .limit(1)
    if (existing) throw new BadRequestException("Employee ID already exists")
  }

  private async assertUserNotTeacher(tenantId: string, userId: string): Promise<void> {
    const [existing] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(
        and(
          eq(teachers.tenantId, tenantId),
          eq(teachers.userId, userId),
          isNull(teachers.deletedAt)
        )
      )
      .limit(1)
    if (existing) throw new BadRequestException("User already linked to another teacher record")
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "employeeId":
        return teachers.employeeId
      case "gender":
        return teachers.gender
      case "status":
        return teachers.status
      case "joinDate":
        return teachers.joinDate
      case "updatedAt":
        return teachers.updatedAt
      case "createdAt":
      default:
        return teachers.createdAt
    }
  }
}
