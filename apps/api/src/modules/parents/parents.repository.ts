import {
  attendance,
  classes,
  db,
  grades,
  parentStudent,
  parents,
  students,
  users,
} from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateParentDto } from "./dto/create-parent.dto"
import { ListParentsQueryDto } from "./dto/list-parents-query.dto"
import { UpdateParentDto } from "./dto/update-parent.dto"
import { toParentView } from "./parents.mapper"
import type { ParentChildView, ParentView } from "./parents.types"

@Injectable()
export class ParentsRepository {
  async list(query: ListParentsQueryDto): Promise<{
    data: ParentView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(parents.tenantId, query.tenantId), isNull(parents.deletedAt)]
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(parents.phone, `%${search}%`)
          )!
        )
      }
    }
    if (query.studentId) {
      filters.push(
        sql`exists (select 1 from parent_student ps where ps.parent_id = ${parents.id} and ps.student_id = ${query.studentId} and ps.deleted_at is null and ps.tenant_id = ${query.tenantId})`
      )
    }

    const whereExpr = and(...filters)
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(parents)
      .innerJoin(users, eq(users.id, parents.userId))
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select({ parent: parents, user: users })
      .from(parents)
      .innerJoin(users, eq(users.id, parents.userId))
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => toParentView(row.parent, row.user)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, id: string): Promise<ParentView> {
    const row = await this.findParentRowOrThrow(tenantId, id)
    return toParentView(row.parent, row.user)
  }

  async create(payload: CreateParentDto): Promise<ParentView> {
    const user = await this.findParentUserOrThrow(payload.tenantId, payload.userId)
    await this.assertUserNotParent(payload.tenantId, payload.userId)

    const [created] = await db
      .insert(parents)
      .values({
        tenantId: payload.tenantId,
        userId: payload.userId,
        phone: payload.phone ?? null,
        occupation: payload.occupation ?? null,
        address: payload.address ?? null,
        relationship: payload.relationship ?? "parent",
      })
      .returning()
    if (!created) throw new BadRequestException("Failed to create parent")

    if (payload.studentIds && payload.studentIds.length > 0) {
      await this.linkManyStudents(payload.tenantId, created.id, payload.studentIds)
    }

    return toParentView(created, user)
  }

  async update(tenantId: string, id: string, payload: UpdateParentDto): Promise<ParentView> {
    const current = await this.findParentRowOrThrow(tenantId, id)
    const updatePayload: Partial<typeof parents.$inferInsert> = { updatedAt: new Date() }
    if (typeof payload.phone !== "undefined") updatePayload.phone = payload.phone
    if (typeof payload.occupation !== "undefined") updatePayload.occupation = payload.occupation
    if (typeof payload.address !== "undefined") updatePayload.address = payload.address
    if (typeof payload.relationship !== "undefined")
      updatePayload.relationship = payload.relationship

    const [updated] = await db
      .update(parents)
      .set(updatePayload)
      .where(and(eq(parents.id, id), eq(parents.tenantId, tenantId), isNull(parents.deletedAt)))
      .returning()
    if (!updated) throw new NotFoundException("Parent not found")
    return toParentView(updated, current.user)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findParentRowOrThrow(tenantId, id)
    await db
      .update(parents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(parents.id, id), eq(parents.tenantId, tenantId), isNull(parents.deletedAt)))
    return { success: true }
  }

  async linkStudent(
    tenantId: string,
    parentId: string,
    studentId: string
  ): Promise<{ success: true }> {
    await this.findParentRowOrThrow(tenantId, parentId)
    await this.assertStudentInTenant(tenantId, studentId)

    const [existing] = await db
      .select({ id: parentStudent.id })
      .from(parentStudent)
      .where(
        and(
          eq(parentStudent.tenantId, tenantId),
          eq(parentStudent.parentId, parentId),
          eq(parentStudent.studentId, studentId),
          isNull(parentStudent.deletedAt)
        )
      )
      .limit(1)
    if (!existing) {
      await db.insert(parentStudent).values({ tenantId, parentId, studentId })
    }
    return { success: true }
  }

  async unlinkStudent(
    tenantId: string,
    parentId: string,
    studentId: string
  ): Promise<{ success: true }> {
    await this.findParentRowOrThrow(tenantId, parentId)
    await db
      .update(parentStudent)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(parentStudent.tenantId, tenantId),
          eq(parentStudent.parentId, parentId),
          eq(parentStudent.studentId, studentId),
          isNull(parentStudent.deletedAt)
        )
      )
    return { success: true }
  }

  async getChildren(tenantId: string, parentId: string): Promise<ParentChildView[]> {
    await this.findParentRowOrThrow(tenantId, parentId)

    const rows = await db
      .select({
        id: students.id,
        firstName: users.firstName,
        lastName: users.lastName,
        studentId: students.studentId,
        className: classes.name,
        attendanceCount: sql<number>`count(distinct ${attendance.id})::int`,
        gradesCount: sql<number>`count(distinct ${grades.id})::int`,
        averageGrade: sql<string>`coalesce(avg(${grades.score}), 0)`,
      })
      .from(parentStudent)
      .innerJoin(students, eq(students.id, parentStudent.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .leftJoin(
        attendance,
        and(
          eq(attendance.studentId, students.id),
          eq(attendance.tenantId, tenantId),
          isNull(attendance.deletedAt)
        )
      )
      .leftJoin(
        grades,
        and(
          eq(grades.studentId, students.id),
          eq(grades.tenantId, tenantId),
          isNull(grades.deletedAt)
        )
      )
      .where(
        and(
          eq(parentStudent.tenantId, tenantId),
          eq(parentStudent.parentId, parentId),
          isNull(parentStudent.deletedAt),
          isNull(students.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .groupBy(students.id, users.firstName, users.lastName, students.studentId, classes.name)
      .orderBy(asc(users.firstName), asc(users.lastName))

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      studentId: row.studentId,
      className: row.className,
      attendanceCount: row.attendanceCount,
      gradesCount: row.gradesCount,
      averageGrade: Number(row.averageGrade),
    }))
  }

  private async findParentRowOrThrow(
    tenantId: string,
    parentId: string
  ): Promise<{ parent: typeof parents.$inferSelect; user: typeof users.$inferSelect }> {
    const [row] = await db
      .select({ parent: parents, user: users })
      .from(parents)
      .innerJoin(users, eq(users.id, parents.userId))
      .where(
        and(eq(parents.id, parentId), eq(parents.tenantId, tenantId), isNull(parents.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Parent not found")
    return row
  }

  private async findParentUserOrThrow(
    tenantId: string,
    userId: string
  ): Promise<typeof users.$inferSelect> {
    const [row] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          eq(users.role, "parent"),
          isNull(users.deletedAt)
        )
      )
      .limit(1)
    if (!row) throw new NotFoundException("Parent user account not found in tenant")
    return row
  }

  private async assertUserNotParent(tenantId: string, userId: string): Promise<void> {
    const [existing] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(
        and(eq(parents.tenantId, tenantId), eq(parents.userId, userId), isNull(parents.deletedAt))
      )
      .limit(1)
    if (existing) throw new BadRequestException("User already linked to another parent record")
  }

  private async assertStudentInTenant(tenantId: string, studentId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(eq(students.id, studentId), eq(students.tenantId, tenantId), isNull(students.deletedAt))
      )
      .limit(1)
    if (!row) throw new BadRequestException("Student not found in tenant")
  }

  private async linkManyStudents(
    tenantId: string,
    parentId: string,
    studentIds: string[]
  ): Promise<void> {
    for (const studentId of studentIds) {
      await this.linkStudent(tenantId, parentId, studentId)
    }
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "phone":
        return parents.phone
      case "relationship":
        return parents.relationship
      case "updatedAt":
        return parents.updatedAt
      case "createdAt":
      default:
        return parents.createdAt
    }
  }
}
