import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { classes, db, examResults, exams, students, subjects, users } from "@talimy/database"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm"

import { CreateExamDto, UpdateExamDto } from "./dto/create-exam.dto"
import { EnterExamResultsDto } from "./dto/exam-result.dto"
import { ExamQueryDto } from "./dto/exam-query.dto"
import type { ExamResultView, ExamStats, ExamView } from "./exams.types"

@Injectable()
export class ExamsRepository {
  async list(query: ExamQueryDto) {
    const filters = this.buildExamFilters(query)
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .innerJoin(classes, eq(classes.id, exams.classId))
      .where(and(...filters))

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select({
        id: exams.id,
        tenantId: exams.tenantId,
        name: exams.name,
        type: exams.type,
        subjectId: exams.subjectId,
        subjectName: subjects.name,
        classId: exams.classId,
        className: classes.name,
        date: exams.date,
        totalMarks: exams.totalMarks,
        duration: exams.duration,
        createdAt: exams.createdAt,
        updatedAt: exams.updatedAt,
      })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .innerJoin(classes, eq(classes.id, exams.classId))
      .where(and(...filters))
      .orderBy(desc(exams.date), desc(exams.updatedAt), asc(exams.name))
      .limit(query.limit)
      .offset(offset)

    const examIds = rows.map((row) => row.id)
    const resultsCountByExam = new Map<string, number>()
    if (examIds.length > 0) {
      const resultCounts = await db
        .select({ examId: examResults.examId, total: count(examResults.id) })
        .from(examResults)
        .where(
          and(
            inArray(examResults.examId, examIds),
            eq(examResults.tenantId, query.tenantId),
            isNull(examResults.deletedAt)
          )
        )
        .groupBy(examResults.examId)
      for (const row of resultCounts) resultsCountByExam.set(row.examId, Number(row.total))
    }

    return {
      data: rows.map((row) => this.mapExamRow(row, resultsCountByExam.get(row.id) ?? 0)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, id: string): Promise<ExamView> {
    const [row] = await db
      .select({
        id: exams.id,
        tenantId: exams.tenantId,
        name: exams.name,
        type: exams.type,
        subjectId: exams.subjectId,
        subjectName: subjects.name,
        classId: exams.classId,
        className: classes.name,
        date: exams.date,
        totalMarks: exams.totalMarks,
        duration: exams.duration,
        createdAt: exams.createdAt,
        updatedAt: exams.updatedAt,
      })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .innerJoin(classes, eq(classes.id, exams.classId))
      .where(
        and(
          eq(exams.id, id),
          eq(exams.tenantId, tenantId),
          isNull(exams.deletedAt),
          isNull(subjects.deletedAt),
          isNull(classes.deletedAt)
        )
      )
      .limit(1)
    if (!row) throw new NotFoundException("Exam not found")

    const [resultCount] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(examResults)
      .where(
        and(
          eq(examResults.examId, id),
          eq(examResults.tenantId, tenantId),
          isNull(examResults.deletedAt)
        )
      )

    return this.mapExamRow(row, resultCount?.total ?? 0)
  }

  async create(payload: CreateExamDto): Promise<ExamView> {
    await this.assertClassInTenant(payload.tenantId, payload.classId)
    await this.assertSubjectInTenant(payload.tenantId, payload.subjectId)

    const [created] = await db
      .insert(exams)
      .values({
        tenantId: payload.tenantId,
        name: payload.name,
        type: payload.type,
        subjectId: payload.subjectId,
        classId: payload.classId,
        date: payload.date,
        totalMarks: payload.totalMarks,
        duration: payload.duration,
      })
      .returning()
    if (!created) throw new BadRequestException("Failed to create exam")

    return this.getById(payload.tenantId, created.id)
  }

  async update(tenantId: string, id: string, payload: UpdateExamDto): Promise<ExamView> {
    const current = await this.findExamOrThrow(tenantId, id)
    if (payload.classId) await this.assertClassInTenant(tenantId, payload.classId)
    if (payload.subjectId) await this.assertSubjectInTenant(tenantId, payload.subjectId)

    await db
      .update(exams)
      .set({
        name: payload.name ?? current.name,
        type: payload.type ?? current.type,
        subjectId: payload.subjectId ?? current.subjectId,
        classId: payload.classId ?? current.classId,
        date: payload.date ?? current.date,
        totalMarks: payload.totalMarks ?? current.totalMarks,
        duration: payload.duration ?? current.duration,
        updatedAt: new Date(),
      })
      .where(and(eq(exams.id, id), eq(exams.tenantId, tenantId), isNull(exams.deletedAt)))

    return this.getById(tenantId, id)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findExamOrThrow(tenantId, id)
    await db
      .update(exams)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(exams.id, id), eq(exams.tenantId, tenantId), isNull(exams.deletedAt)))
    return { success: true }
  }

  async enterResults(tenantId: string, examId: string, payload: EnterExamResultsDto) {
    const exam = await this.findExamOrThrow(tenantId, examId)
    const studentIds = payload.records.map((record) => record.studentId)
    if (studentIds.length === 0) throw new BadRequestException("records cannot be empty")

    await this.assertStudentsInExamClass(tenantId, exam.classId, studentIds)

    let affected = 0
    for (const record of payload.records) {
      if (record.score < 0 || Number(record.score) > Number(exam.totalMarks)) {
        throw new BadRequestException(`score must be between 0 and ${Number(exam.totalMarks)}`)
      }

      const [existing] = await db
        .select({ id: examResults.id })
        .from(examResults)
        .where(
          and(
            eq(examResults.tenantId, tenantId),
            eq(examResults.examId, examId),
            eq(examResults.studentId, record.studentId),
            isNull(examResults.deletedAt)
          )
        )
        .limit(1)

      if (existing) {
        await db
          .update(examResults)
          .set({
            score: String(record.score),
            grade: record.grade ?? null,
            rank: record.rank ?? null,
            updatedAt: new Date(),
          })
          .where(eq(examResults.id, existing.id))
      } else {
        await db.insert(examResults).values({
          tenantId,
          examId,
          studentId: record.studentId,
          score: String(record.score),
          grade: record.grade ?? null,
          rank: record.rank ?? null,
        })
      }
      affected += 1
    }

    return { success: true, affected }
  }

  async getResultsByExam(tenantId: string, examId: string, query: ExamQueryDto) {
    await this.findExamOrThrow(tenantId, examId)
    return this.listResults({
      tenantId,
      examId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      order: query.order,
    })
  }

  async getResultsByStudent(tenantId: string, studentId: string, query: ExamQueryDto) {
    await this.assertStudentInTenant(tenantId, studentId)
    return this.listResults({
      tenantId,
      studentId,
      examId: query.examId,
      classId: query.classId,
      subjectId: query.subjectId,
      type: query.type,
      page: query.page,
      limit: query.limit,
      search: query.search,
      order: query.order,
    })
  }

  async getStats(tenantId: string, examId: string): Promise<ExamStats> {
    const exam = await this.getById(tenantId, examId)
    const rows = await this.listResultRows([
      eq(examResults.tenantId, tenantId),
      eq(examResults.examId, examId),
      isNull(examResults.deletedAt),
      isNull(exams.deletedAt),
      isNull(students.deletedAt),
      isNull(users.deletedAt),
    ])

    const scores = rows.map((row) => row.score)
    const totals = {
      resultsCount: rows.length,
      averageScore: rows.length
        ? this.round(scores.reduce((sum, value) => sum + value, 0) / rows.length)
        : null,
      highestScore: rows.length ? Math.max(...scores) : null,
      lowestScore: rows.length ? Math.min(...scores) : null,
      averagePercentage: rows.length
        ? this.round(rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length)
        : null,
    }

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        date: exam.date,
        totalMarks: exam.totalMarks,
        classId: exam.classId,
        className: exam.className,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
      },
      totals,
      topPerformers: rows
        .slice()
        .sort((a, b) => b.score - a.score || a.studentName.localeCompare(b.studentName))
        .slice(0, 5)
        .map((row) => ({
          studentId: row.studentId,
          studentName: row.studentName,
          studentCode: row.studentCode,
          score: row.score,
          percentage: row.percentage,
          grade: row.grade,
          rank: row.rank,
        })),
    }
  }

  private async listResults(query: {
    tenantId: string
    examId?: string
    studentId?: string
    classId?: string
    subjectId?: string
    type?: "midterm" | "final" | "quiz" | "custom"
    page: number
    limit: number
    search?: string
    order: "asc" | "desc"
  }) {
    const filters = this.buildResultFilters(query)

    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(examResults)
      .innerJoin(exams, eq(exams.id, examResults.examId))
      .innerJoin(students, eq(students.id, examResults.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(...filters))

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await this.listResultRows(filters, query.limit, offset, query.order)
    return {
      data: rows,
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  private async listResultRows(
    filters: SQL[],
    limit?: number,
    offset?: number,
    order: "asc" | "desc" = "desc"
  ): Promise<ExamResultView[]> {
    const orderedByScore = order === "asc" ? asc(examResults.score) : desc(examResults.score)
    const baseQuery = db
      .select({
        id: examResults.id,
        tenantId: examResults.tenantId,
        examId: exams.id,
        examName: exams.name,
        examType: exams.type,
        examDate: exams.date,
        totalMarks: exams.totalMarks,
        studentId: students.id,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentCode: students.studentId,
        score: examResults.score,
        grade: examResults.grade,
        rank: examResults.rank,
        createdAt: examResults.createdAt,
        updatedAt: examResults.updatedAt,
      })
      .from(examResults)
      .innerJoin(exams, eq(exams.id, examResults.examId))
      .innerJoin(students, eq(students.id, examResults.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(...filters))
      .orderBy(desc(exams.date), orderedByScore, asc(users.firstName), asc(users.lastName))

    const rows =
      typeof limit === "number" && typeof offset === "number"
        ? await baseQuery.limit(limit).offset(offset)
        : await baseQuery

    return rows.map((row) => {
      const score = Number(row.score)
      const totalMarks = Number(row.totalMarks)
      return {
        id: row.id,
        tenantId: row.tenantId,
        examId: row.examId,
        examName: row.examName,
        examType: row.examType,
        examDate: row.examDate,
        totalMarks,
        studentId: row.studentId,
        studentName: `${row.studentFirstName} ${row.studentLastName}`.trim(),
        studentCode: row.studentCode,
        score,
        percentage: totalMarks > 0 ? this.round((score / totalMarks) * 100) : 0,
        grade: row.grade,
        rank: row.rank,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })
  }

  private buildExamFilters(query: ExamQueryDto): SQL[] {
    const filters: SQL[] = [
      eq(exams.tenantId, query.tenantId),
      isNull(exams.deletedAt),
      isNull(subjects.deletedAt),
      isNull(classes.deletedAt),
    ]

    if (query.classId) filters.push(eq(exams.classId, query.classId))
    if (query.subjectId) filters.push(eq(exams.subjectId, query.subjectId))
    if (query.type) filters.push(eq(exams.type, query.type))
    if (query.dateFrom) filters.push(gte(exams.date, query.dateFrom))
    if (query.dateTo) filters.push(lte(exams.date, query.dateTo))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(exams.name, `%${search}%`),
            ilike(subjects.name, `%${search}%`),
            ilike(classes.name, `%${search}%`)
          )!
        )
      }
    }

    return filters
  }

  private buildResultFilters(query: {
    tenantId: string
    examId?: string
    studentId?: string
    classId?: string
    subjectId?: string
    type?: "midterm" | "final" | "quiz" | "custom"
    search?: string
  }): SQL[] {
    const filters: SQL[] = [
      eq(examResults.tenantId, query.tenantId),
      isNull(examResults.deletedAt),
      isNull(exams.deletedAt),
      isNull(students.deletedAt),
      isNull(users.deletedAt),
    ]

    if (query.examId) filters.push(eq(examResults.examId, query.examId))
    if (query.studentId) filters.push(eq(examResults.studentId, query.studentId))
    if (query.classId) filters.push(eq(exams.classId, query.classId))
    if (query.subjectId) filters.push(eq(exams.subjectId, query.subjectId))
    if (query.type) filters.push(eq(exams.type, query.type))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(exams.name, `%${search}%`),
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(students.studentId, `%${search}%`)
          )!
        )
      }
    }

    return filters
  }

  private mapExamRow(
    row: {
      id: string
      tenantId: string
      name: string
      type: "midterm" | "final" | "quiz" | "custom"
      subjectId: string
      subjectName: string
      classId: string
      className: string
      date: string
      totalMarks: number
      duration: number
      createdAt: Date
      updatedAt: Date
    },
    resultsCount = 0
  ): ExamView {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.type,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      classId: row.classId,
      className: row.className,
      date: row.date,
      totalMarks: Number(row.totalMarks),
      duration: Number(row.duration),
      resultsCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }

  private async findExamOrThrow(tenantId: string, examId: string) {
    const [row] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), eq(exams.tenantId, tenantId), isNull(exams.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundException("Exam not found")
    return row
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

  private async assertSubjectInTenant(tenantId: string, subjectId: string): Promise<void> {
    const [row] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(
        and(eq(subjects.id, subjectId), eq(subjects.tenantId, tenantId), isNull(subjects.deletedAt))
      )
      .limit(1)
    if (!row) throw new NotFoundException("Subject not found in tenant")
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

  private async assertStudentsInExamClass(
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
      throw new BadRequestException("One or more students do not belong to the exam class")
    }
  }
}
