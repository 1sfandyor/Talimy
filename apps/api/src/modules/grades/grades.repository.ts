import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import {
  classes,
  db,
  gradeScales,
  grades,
  students,
  subjects,
  teachers,
  terms,
  users,
} from "@talimy/database"
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL, sql } from "drizzle-orm"

import { CreateGradeDto, CreateGradeScaleDto, UpdateGradeScaleDto } from "./dto/create-grade.dto"
import { GradeQueryDto } from "./dto/grade-query.dto"
import type { GradeListItem, GradeReport, GradeScaleView } from "./grades.types"

@Injectable()
export class GradesRepository {
  async enter(payload: CreateGradeDto): Promise<{ success: true; affected: number }> {
    await this.assertSubjectInTenant(payload.tenantId, payload.subjectId)
    await this.assertTermInTenant(payload.tenantId, payload.termId)
    if (payload.teacherId) {
      await this.assertTeacherInTenant(payload.tenantId, payload.teacherId)
    }

    const studentIds = payload.records.map((record) => record.studentId)
    if (studentIds.length === 0) {
      throw new BadRequestException("records cannot be empty")
    }
    if (payload.classId) {
      await this.assertClassInTenant(payload.tenantId, payload.classId)
      await this.assertStudentsInClass(payload.tenantId, payload.classId, studentIds)
    } else {
      await this.assertStudentsInTenant(payload.tenantId, studentIds)
    }

    let affected = 0
    for (const record of payload.records) {
      const [existing] = await db
        .select({ id: grades.id })
        .from(grades)
        .where(
          and(
            eq(grades.tenantId, payload.tenantId),
            eq(grades.studentId, record.studentId),
            eq(grades.subjectId, payload.subjectId),
            eq(grades.termId, payload.termId),
            isNull(grades.deletedAt)
          )
        )
        .limit(1)

      if (existing) {
        await db
          .update(grades)
          .set({
            score: String(record.score),
            grade: record.grade ?? null,
            teacherId: payload.teacherId ?? null,
            comment: record.comment ?? null,
            updatedAt: new Date(),
          })
          .where(eq(grades.id, existing.id))
      } else {
        await db.insert(grades).values({
          tenantId: payload.tenantId,
          studentId: record.studentId,
          subjectId: payload.subjectId,
          termId: payload.termId,
          score: String(record.score),
          grade: record.grade ?? null,
          teacherId: payload.teacherId ?? null,
          comment: record.comment ?? null,
        })
      }
      affected += 1
    }

    return { success: true, affected }
  }

  async list(query: GradeQueryDto): Promise<{
    data: GradeListItem[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters = this.buildFilters(query)
    return this.listWithMeta(filters, query)
  }

  async getByStudent(tenantId: string, studentId: string, query: GradeQueryDto) {
    await this.assertStudentInTenant(tenantId, studentId)
    const filters = this.buildFilters({ ...query, tenantId, studentId })
    return this.listWithMeta(filters, query)
  }

  async getByClass(tenantId: string, classId: string, query: GradeQueryDto) {
    await this.assertClassInTenant(tenantId, classId)
    const filters = this.buildFilters({ ...query, tenantId, classId })
    return this.listWithMeta(filters, query)
  }

  async report(query: GradeQueryDto): Promise<GradeReport> {
    const rows = await this.listRows(this.buildFilters(query))
    const scales = await this.listScales(query.tenantId)

    const scores = rows.map((row) => row.score)
    const totals = {
      count: rows.length,
      averageScore: rows.length ? this.round(scores.reduce((a, b) => a + b, 0) / rows.length) : null,
      minScore: rows.length ? Math.min(...scores) : null,
      maxScore: rows.length ? Math.max(...scores) : null,
    }

    const byStudentMap = new Map<
      string,
      {
        studentId: string
        studentName: string
        studentCode: string
        gradesCount: number
        scoreSum: number
        gpaSum: number
        gpaCount: number
      }
    >()
    const bySubjectMap = new Map<
      string,
      { subjectId: string; subjectName: string; gradesCount: number; scoreSum: number }
    >()

    for (const row of rows) {
      const studentCurrent = byStudentMap.get(row.studentId) ?? {
        studentId: row.studentId,
        studentName: row.studentName,
        studentCode: row.studentCode,
        gradesCount: 0,
        scoreSum: 0,
        gpaSum: 0,
        gpaCount: 0,
      }
      studentCurrent.gradesCount += 1
      studentCurrent.scoreSum += row.score
      const gpa = this.resolveGpa(scales, row.score)
      if (gpa !== null) {
        studentCurrent.gpaSum += gpa
        studentCurrent.gpaCount += 1
      }
      byStudentMap.set(row.studentId, studentCurrent)

      const subjectCurrent = bySubjectMap.get(row.subjectId) ?? {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        gradesCount: 0,
        scoreSum: 0,
      }
      subjectCurrent.gradesCount += 1
      subjectCurrent.scoreSum += row.score
      bySubjectMap.set(row.subjectId, subjectCurrent)
    }

    return {
      period: {
        termId: query.termId ?? null,
        subjectId: query.subjectId ?? null,
        classId: query.classId ?? null,
        studentId: query.studentId ?? null,
      },
      totals,
      byStudent: Array.from(byStudentMap.values())
        .map((row) => ({
          studentId: row.studentId,
          studentName: row.studentName,
          studentCode: row.studentCode,
          gradesCount: row.gradesCount,
          averageScore: this.round(row.scoreSum / row.gradesCount),
          averageGpa: row.gpaCount > 0 ? this.round(row.gpaSum / row.gpaCount) : null,
        }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName)),
      bySubject: Array.from(bySubjectMap.values())
        .map((row) => ({
          subjectId: row.subjectId,
          subjectName: row.subjectName,
          gradesCount: row.gradesCount,
          averageScore: this.round(row.scoreSum / row.gradesCount),
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    }
  }

  async listScales(tenantId: string): Promise<GradeScaleView[]> {
    const rows = await db
      .select()
      .from(gradeScales)
      .where(and(eq(gradeScales.tenantId, tenantId), isNull(gradeScales.deletedAt)))
      .orderBy(desc(gradeScales.maxScore), desc(gradeScales.minScore))

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      minScore: Number(row.minScore),
      maxScore: Number(row.maxScore),
      grade: row.grade,
      gpa: row.gpa === null ? null : Number(row.gpa),
    }))
  }

  async createScale(payload: CreateGradeScaleDto): Promise<GradeScaleView> {
    this.assertValidScaleRange(payload.minScore, payload.maxScore)
    await this.assertNoScaleOverlap(payload.tenantId, payload.minScore, payload.maxScore)

    const [created] = await db
      .insert(gradeScales)
      .values({
        tenantId: payload.tenantId,
        name: payload.name,
        minScore: String(payload.minScore),
        maxScore: String(payload.maxScore),
        grade: payload.grade,
        gpa: typeof payload.gpa === "number" ? String(payload.gpa) : null,
      })
      .returning()
    if (!created) throw new BadRequestException("Failed to create grade scale")

    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      minScore: Number(created.minScore),
      maxScore: Number(created.maxScore),
      grade: created.grade,
      gpa: created.gpa === null ? null : Number(created.gpa),
    }
  }

  async updateScale(tenantId: string, id: string, payload: UpdateGradeScaleDto): Promise<GradeScaleView> {
    const current = await this.findScaleOrThrow(tenantId, id)
    const next = {
      name: payload.name ?? current.name,
      minScore: typeof payload.minScore === "number" ? payload.minScore : Number(current.minScore),
      maxScore: typeof payload.maxScore === "number" ? payload.maxScore : Number(current.maxScore),
      grade: payload.grade ?? current.grade,
      gpa: typeof payload.gpa === "number" ? payload.gpa : payload.gpa === null ? null : current.gpa,
    }

    this.assertValidScaleRange(next.minScore, next.maxScore)
    await this.assertNoScaleOverlap(tenantId, next.minScore, next.maxScore, id)

    const [updated] = await db
      .update(gradeScales)
      .set({
        name: next.name,
        minScore: String(next.minScore),
        maxScore: String(next.maxScore),
        grade: next.grade,
        gpa: next.gpa === null ? null : String(next.gpa),
        updatedAt: new Date(),
      })
      .where(and(eq(gradeScales.id, id), eq(gradeScales.tenantId, tenantId), isNull(gradeScales.deletedAt)))
      .returning()
    if (!updated) throw new NotFoundException("Grade scale not found")

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      minScore: Number(updated.minScore),
      maxScore: Number(updated.maxScore),
      grade: updated.grade,
      gpa: updated.gpa === null ? null : Number(updated.gpa),
    }
  }

  async deleteScale(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findScaleOrThrow(tenantId, id)
    await db
      .update(gradeScales)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(gradeScales.id, id), eq(gradeScales.tenantId, tenantId), isNull(gradeScales.deletedAt)))
    return { success: true }
  }

  private async listWithMeta(filters: SQL[], query: GradeQueryDto) {
    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(grades)
      .innerJoin(students, eq(students.id, grades.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(subjects, eq(subjects.id, grades.subjectId))
      .innerJoin(terms, eq(terms.id, grades.termId))
      .where(and(...filters))

    const total = totalRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await this.listRows(filters, query.limit, offset)
    return {
      data: rows,
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  private async listRows(filters: SQL[], limit?: number, offset?: number): Promise<GradeListItem[]> {
    const baseQuery = db
      .select({
        id: grades.id,
        tenantId: grades.tenantId,
        studentId: students.id,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentCode: students.studentId,
        classId: students.classId,
        className: classes.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        termId: terms.id,
        termName: terms.name,
        teacherId: grades.teacherId,
        score: grades.score,
        grade: grades.grade,
        comment: grades.comment,
        createdAt: grades.createdAt,
        updatedAt: grades.updatedAt,
      })
      .from(grades)
      .innerJoin(students, eq(students.id, grades.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(subjects, eq(subjects.id, grades.subjectId))
      .innerJoin(terms, eq(terms.id, grades.termId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(and(...filters))
      .orderBy(desc(grades.updatedAt), desc(grades.createdAt), asc(users.firstName), asc(users.lastName))

    const rows =
      typeof limit === "number" && typeof offset === "number"
        ? await baseQuery.limit(limit).offset(offset)
        : typeof limit === "number"
          ? await baseQuery.limit(limit)
          : await baseQuery

    const teacherIds = rows.map((row) => row.teacherId).filter((value): value is string => Boolean(value))
    const teacherNameById = new Map<string, string>()
    if (teacherIds.length > 0) {
      const teacherRows = await db
        .select({
          id: teachers.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(teachers)
        .innerJoin(users, eq(users.id, teachers.userId))
        .where(and(inArray(teachers.id, teacherIds), isNull(teachers.deletedAt), isNull(users.deletedAt)))
      for (const row of teacherRows) {
        teacherNameById.set(row.id, `${row.firstName} ${row.lastName}`.trim())
      }
    }

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      studentId: row.studentId,
      studentName: `${row.studentFirstName} ${row.studentLastName}`.trim(),
      studentCode: row.studentCode,
      classId: row.classId,
      className: row.className,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      termId: row.termId,
      termName: row.termName,
      teacherId: row.teacherId,
      teacherName: row.teacherId ? (teacherNameById.get(row.teacherId) ?? null) : null,
      score: Number(row.score),
      grade: row.grade,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  }

  private buildFilters(query: GradeQueryDto): SQL[] {
    const filters: SQL[] = [eq(grades.tenantId, query.tenantId), isNull(grades.deletedAt)]
    filters.push(isNull(students.deletedAt), isNull(users.deletedAt), isNull(subjects.deletedAt), isNull(terms.deletedAt))
    if (query.studentId) filters.push(eq(grades.studentId, query.studentId))
    if (query.classId) filters.push(eq(students.classId, query.classId))
    if (query.subjectId) filters.push(eq(grades.subjectId, query.subjectId))
    if (query.termId) filters.push(eq(grades.termId, query.termId))
    if (query.teacherId) filters.push(eq(grades.teacherId, query.teacherId))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(students.studentId, `%${search}%`),
            ilike(subjects.name, `%${search}%`),
            ilike(terms.name, `%${search}%`)
          )!
        )
      }
    }
    return filters
  }

  private resolveGpa(scales: GradeScaleView[], score: number): number | null {
    const matched = scales.find((scale) => score >= scale.minScore && score <= scale.maxScore)
    return matched?.gpa ?? null
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }

  private assertValidScaleRange(minScore: number, maxScore: number): void {
    if (Number.isNaN(minScore) || Number.isNaN(maxScore)) {
      throw new BadRequestException("Invalid grade scale score range")
    }
    if (minScore > maxScore) {
      throw new BadRequestException("minScore cannot be greater than maxScore")
    }
  }

  private async assertNoScaleOverlap(
    tenantId: string,
    minScore: number,
    maxScore: number,
    excludeId?: string
  ): Promise<void> {
    const rows = await db
      .select()
      .from(gradeScales)
      .where(and(eq(gradeScales.tenantId, tenantId), isNull(gradeScales.deletedAt)))

    const hasOverlap = rows.some((row) => {
      if (excludeId && row.id === excludeId) return false
      const rowMin = Number(row.minScore)
      const rowMax = Number(row.maxScore)
      return minScore <= rowMax && maxScore >= rowMin
    })
    if (hasOverlap) {
      throw new BadRequestException("Grade scale range overlaps with an existing scale")
    }
  }

  private async findScaleOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(gradeScales)
      .where(and(eq(gradeScales.id, id), eq(gradeScales.tenantId, tenantId), isNull(gradeScales.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Grade scale not found")
    return row
  }

  private async assertClassInTenant(tenantId: string, classId: string): Promise<void> {
    const [row] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Class not found in tenant")
  }

  private async assertTeacherInTenant(tenantId: string, teacherId: string): Promise<void> {
    const [row] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(and(eq(teachers.id, teacherId), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Teacher not found in tenant")
  }

  private async assertStudentInTenant(tenantId: string, studentId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId), isNull(students.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Student not found in tenant")
  }

  private async assertStudentsInTenant(tenantId: string, studentIds: string[]): Promise<void> {
    const rows = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.tenantId, tenantId), inArray(students.id, studentIds), isNull(students.deletedAt)))
    if (rows.length !== studentIds.length) {
      throw new BadRequestException("One or more students do not belong to this tenant")
    }
  }

  private async assertStudentsInClass(
    tenantId: string,
    classId: string,
    studentIds: string[]
  ): Promise<void> {
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

  private async assertSubjectInTenant(tenantId: string, subjectId: string): Promise<void> {
    const [row] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.tenantId, tenantId), isNull(subjects.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Subject not found in tenant")
  }

  private async assertTermInTenant(tenantId: string, termId: string): Promise<void> {
    const [row] = await db
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.id, termId), eq(terms.tenantId, tenantId), isNull(terms.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Term not found in tenant")
  }
}
