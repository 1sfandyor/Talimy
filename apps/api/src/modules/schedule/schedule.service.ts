import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { classes, db, schedules, subjects, teachers, users } from "@talimy/database"
import { and, asc, desc, eq, gt, ilike, isNull, lt, ne, or, type SQL, sql } from "drizzle-orm"

import { CreateScheduleDto, UpdateScheduleDto } from "./dto/create-schedule.dto"
import { ScheduleQueryDto } from "./dto/schedule-query.dto"

type ScheduleListItem = {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string | null
}

type ScheduleDayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

@Injectable()
export class ScheduleService {
  async list(query: ScheduleQueryDto): Promise<{
    data: ScheduleListItem[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(schedules.tenantId, query.tenantId), isNull(schedules.deletedAt)]

    if (query.classId) filters.push(eq(schedules.classId, query.classId))
    if (query.subjectId) filters.push(eq(schedules.subjectId, query.subjectId))
    if (query.teacherId) filters.push(eq(schedules.teacherId, query.teacherId))
    if (query.dayOfWeek) filters.push(eq(schedules.dayOfWeek, query.dayOfWeek))
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`
      filters.push(
        or(ilike(classes.name, search), ilike(subjects.name, search), ilike(users.firstName, search), ilike(users.lastName, search))!
      )
    }

    const whereExpr = and(...filters)
    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(schedules)
      .innerJoin(classes, eq(classes.id, schedules.classId))
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .innerJoin(teachers, eq(teachers.id, schedules.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          whereExpr,
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )

    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const orderColumns = this.resolveOrderBy(query.sort, query.order)
    const rows = await db
      .select({
        id: schedules.id,
        classId: classes.id,
        className: classes.name,
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
      .innerJoin(classes, eq(classes.id, schedules.classId))
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .innerJoin(teachers, eq(teachers.id, schedules.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          whereExpr,
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .orderBy(...orderColumns)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => this.mapScheduleRow(row)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async create(payload: CreateScheduleDto): Promise<ScheduleListItem> {
    this.assertTimeRange(payload.startTime, payload.endTime)
    const room = this.normalizeRoom(payload.room)

    await this.assertClassExists(payload.tenantId, payload.classId)
    await this.assertSubjectExists(payload.tenantId, payload.subjectId)
    await this.assertTeacherExists(payload.tenantId, payload.teacherId)
    await this.assertNoConflict({
      tenantId: payload.tenantId,
      teacherId: payload.teacherId,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      room,
    })

    const [created] = await db
      .insert(schedules)
      .values({
        tenantId: payload.tenantId,
        classId: payload.classId,
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        room,
      })
      .returning({ id: schedules.id })

    if (!created) {
      throw new BadRequestException("Failed to create schedule entry")
    }

    return this.getScheduleById(payload.tenantId, created.id)
  }

  async update(tenantId: string, id: string, payload: UpdateScheduleDto): Promise<ScheduleListItem> {
    const existing = await this.findScheduleOrThrow(tenantId, id)

    const next = {
      classId: payload.classId ?? existing.classId,
      subjectId: payload.subjectId ?? existing.subjectId,
      teacherId: payload.teacherId ?? existing.teacherId,
      dayOfWeek: payload.dayOfWeek ?? existing.dayOfWeek,
      startTime: payload.startTime ?? existing.startTime,
      endTime: payload.endTime ?? existing.endTime,
      room: Object.prototype.hasOwnProperty.call(payload, "room")
        ? this.normalizeRoom(payload.room)
        : existing.room,
    }

    this.assertTimeRange(next.startTime, next.endTime)
    await this.assertClassExists(tenantId, next.classId)
    await this.assertSubjectExists(tenantId, next.subjectId)
    await this.assertTeacherExists(tenantId, next.teacherId)
    await this.assertNoConflict({
      tenantId,
      teacherId: next.teacherId,
      dayOfWeek: next.dayOfWeek,
      startTime: next.startTime,
      endTime: next.endTime,
      room: next.room,
      excludeScheduleId: id,
    })

    const updatePayload: Partial<typeof schedules.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (payload.classId) updatePayload.classId = payload.classId
    if (payload.subjectId) updatePayload.subjectId = payload.subjectId
    if (payload.teacherId) updatePayload.teacherId = payload.teacherId
    if (payload.dayOfWeek) updatePayload.dayOfWeek = payload.dayOfWeek
    if (payload.startTime) updatePayload.startTime = payload.startTime
    if (payload.endTime) updatePayload.endTime = payload.endTime
    if (Object.prototype.hasOwnProperty.call(payload, "room")) updatePayload.room = next.room

    const [updated] = await db
      .update(schedules)
      .set(updatePayload)
      .where(and(eq(schedules.id, id), eq(schedules.tenantId, tenantId), isNull(schedules.deletedAt)))
      .returning({ id: schedules.id })

    if (!updated) {
      throw new NotFoundException("Schedule entry not found")
    }

    return this.getScheduleById(tenantId, updated.id)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findScheduleOrThrow(tenantId, id)
    await db
      .update(schedules)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schedules.id, id), eq(schedules.tenantId, tenantId), isNull(schedules.deletedAt)))

    return { success: true }
  }

  private resolveOrderBy(sort: string | undefined, order: "asc" | "desc") {
    const orderFn = order === "desc" ? desc : asc

    switch (sort) {
      case "dayOfWeek":
        return [orderFn(schedules.dayOfWeek), asc(schedules.startTime)]
      case "startTime":
        return [orderFn(schedules.startTime)]
      case "endTime":
        return [orderFn(schedules.endTime)]
      case "className":
        return [orderFn(classes.name), asc(schedules.dayOfWeek), asc(schedules.startTime)]
      case "subjectName":
        return [orderFn(subjects.name), asc(schedules.dayOfWeek), asc(schedules.startTime)]
      case "createdAt":
        return [orderFn(schedules.createdAt)]
      case "updatedAt":
        return [orderFn(schedules.updatedAt)]
      default:
        return [asc(schedules.dayOfWeek), asc(schedules.startTime), asc(classes.name)]
    }
  }

  private async getScheduleById(tenantId: string, id: string): Promise<ScheduleListItem> {
    const [row] = await db
      .select({
        id: schedules.id,
        classId: classes.id,
        className: classes.name,
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
      .innerJoin(classes, eq(classes.id, schedules.classId))
      .innerJoin(subjects, eq(subjects.id, schedules.subjectId))
      .innerJoin(teachers, eq(teachers.id, schedules.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          eq(schedules.id, id),
          eq(schedules.tenantId, tenantId),
          isNull(schedules.deletedAt),
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )

    if (!row) {
      throw new NotFoundException("Schedule entry not found")
    }

    return this.mapScheduleRow(row)
  }

  private async findScheduleOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select({
        id: schedules.id,
        tenantId: schedules.tenantId,
        classId: schedules.classId,
        subjectId: schedules.subjectId,
        teacherId: schedules.teacherId,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        room: schedules.room,
      })
      .from(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.tenantId, tenantId), isNull(schedules.deletedAt)))

    if (!row) {
      throw new NotFoundException("Schedule entry not found")
    }

    return row
  }

  private async assertClassExists(tenantId: string, classId: string) {
    const [row] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))

    if (!row) {
      throw new NotFoundException("Class not found in tenant")
    }
  }

  private async assertSubjectExists(tenantId: string, subjectId: string) {
    const [row] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.tenantId, tenantId), isNull(subjects.deletedAt)))

    if (!row) {
      throw new NotFoundException("Subject not found in tenant")
    }
  }

  private async assertTeacherExists(tenantId: string, teacherId: string) {
    const [row] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(and(eq(teachers.id, teacherId), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt)))

    if (!row) {
      throw new NotFoundException("Teacher not found in tenant")
    }
  }

  private async assertNoConflict(params: {
    tenantId: string
    teacherId: string
    dayOfWeek: ScheduleDayOfWeek
    startTime: string
    endTime: string
    room: string | null
    excludeScheduleId?: string
  }) {
    const overlapBase: SQL[] = [
      eq(schedules.tenantId, params.tenantId),
      eq(schedules.dayOfWeek, params.dayOfWeek),
      isNull(schedules.deletedAt),
      lt(schedules.startTime, params.endTime),
      gt(schedules.endTime, params.startTime),
    ]
    if (params.excludeScheduleId) {
      overlapBase.push(ne(schedules.id, params.excludeScheduleId))
    }

    const [teacherConflict] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(and(...overlapBase, eq(schedules.teacherId, params.teacherId)))
      .limit(1)

    if (teacherConflict) {
      throw new ConflictException("Teacher schedule conflict detected for the selected time slot")
    }

    if (!params.room) {
      return
    }

    const [roomConflict] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(and(...overlapBase, eq(schedules.room, params.room)))
      .limit(1)

    if (roomConflict) {
      throw new ConflictException("Room schedule conflict detected for the selected time slot")
    }
  }

  private assertTimeRange(startTime: string, endTime: string) {
    if (this.timeToSeconds(startTime) >= this.timeToSeconds(endTime)) {
      throw new BadRequestException("endTime must be later than startTime")
    }
  }

  private normalizeRoom(room: string | null | undefined): string | null {
    if (typeof room !== "string") return null
    const value = room.trim()
    return value.length > 0 ? value : null
  }

  private timeToSeconds(time: string): number {
    const [hours, minutes, seconds = "0"] = time.split(":")
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  }

  private mapScheduleRow(row: {
    id: string
    classId: string
    className: string
    subjectId: string
    subjectName: string
    teacherId: string
    teacherFirstName: string
    teacherLastName: string
    dayOfWeek: string
    startTime: string
    endTime: string
    room: string | null
  }): ScheduleListItem {
    return {
      id: row.id,
      classId: row.classId,
      className: row.className,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      teacherId: row.teacherId,
      teacherName: `${row.teacherFirstName} ${row.teacherLastName}`.trim(),
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
    }
  }
}
