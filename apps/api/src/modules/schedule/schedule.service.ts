import { Injectable } from "@nestjs/common"
import { classes, db, schedules, subjects, teachers, users } from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm"

import { ScheduleQueryDto } from "./dto/schedule-query.dto"

@Injectable()
export class ScheduleService {
  async list(query: ScheduleQueryDto): Promise<{
    data: Array<{
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
    }>
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
      data: rows.map((row) => ({
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
      })),
      meta: { page, limit: query.limit, total, totalPages },
    }
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
}
