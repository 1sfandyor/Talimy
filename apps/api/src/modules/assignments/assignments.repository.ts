import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { assignmentSubmissions, assignments, classes, db, students, subjects, teachers, users } from "@talimy/database"
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm"

import { CreateAssignmentDto, UpdateAssignmentDto } from "./dto/create-assignment.dto"
import { AssignmentQueryDto } from "./dto/assignment-query.dto"
import { GradeAssignmentSubmissionDto, SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import type {
  AssignmentOverviewStats,
  AssignmentStats,
  AssignmentSubmissionView,
  AssignmentView,
} from "./assignments.types"

type AssignmentRow = {
  id: string
  tenantId: string
  teacherId: string
  teacherFirstName: string
  teacherLastName: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  title: string
  description: string | null
  dueDate: Date
  totalPoints: number
  fileUrl: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class AssignmentsRepository {
  async list(query: AssignmentQueryDto) {
    const filters = this.buildAssignmentFilters(query)

    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(assignments)
      .innerJoin(classes, eq(classes.id, assignments.classId))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(teachers, eq(teachers.id, assignments.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(and(...filters))

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select({
        id: assignments.id,
        tenantId: assignments.tenantId,
        teacherId: assignments.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        subjectId: assignments.subjectId,
        subjectName: subjects.name,
        classId: assignments.classId,
        className: classes.name,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        totalPoints: assignments.totalPoints,
        fileUrl: assignments.fileUrl,
        createdAt: assignments.createdAt,
        updatedAt: assignments.updatedAt,
      })
      .from(assignments)
      .innerJoin(classes, eq(classes.id, assignments.classId))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(teachers, eq(teachers.id, assignments.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(and(...filters))
      .orderBy(desc(assignments.dueDate), desc(assignments.updatedAt), asc(assignments.title))
      .limit(query.limit)
      .offset(offset)

    const counters = await this.getSubmissionCounters(
      query.tenantId,
      rows.map((row) => row.id)
    )

    return {
      data: rows.map((row) => this.mapAssignmentRow(row, counters.get(row.id))),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, assignmentId: string): Promise<AssignmentView> {
    const [row] = await db
      .select({
        id: assignments.id,
        tenantId: assignments.tenantId,
        teacherId: assignments.teacherId,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        subjectId: assignments.subjectId,
        subjectName: subjects.name,
        classId: assignments.classId,
        className: classes.name,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        totalPoints: assignments.totalPoints,
        fileUrl: assignments.fileUrl,
        createdAt: assignments.createdAt,
        updatedAt: assignments.updatedAt,
      })
      .from(assignments)
      .innerJoin(classes, eq(classes.id, assignments.classId))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(teachers, eq(teachers.id, assignments.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(
        and(
          eq(assignments.id, assignmentId),
          eq(assignments.tenantId, tenantId),
          isNull(assignments.deletedAt),
          isNull(classes.deletedAt),
          isNull(subjects.deletedAt),
          isNull(teachers.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    if (!row) throw new NotFoundException("Assignment not found")

    const counters = await this.getSubmissionCounters(tenantId, [assignmentId])
    return this.mapAssignmentRow(row, counters.get(assignmentId))
  }

  async create(payload: CreateAssignmentDto): Promise<AssignmentView> {
    await this.assertTeacherInTenant(payload.tenantId, payload.teacherId)
    await this.assertSubjectInTenant(payload.tenantId, payload.subjectId)
    await this.assertClassInTenant(payload.tenantId, payload.classId)

    const [created] = await db
      .insert(assignments)
      .values({
        tenantId: payload.tenantId,
        teacherId: payload.teacherId,
        subjectId: payload.subjectId,
        classId: payload.classId,
        title: payload.title,
        description: payload.description ?? null,
        dueDate: new Date(payload.dueDate),
        totalPoints: payload.totalPoints,
        fileUrl: payload.fileUrl ?? null,
      })
      .returning({ id: assignments.id })

    if (!created) throw new BadRequestException("Failed to create assignment")

    return this.getById(payload.tenantId, created.id)
  }

  async update(tenantId: string, assignmentId: string, payload: UpdateAssignmentDto): Promise<AssignmentView> {
    const current = await this.findAssignmentOrThrow(tenantId, assignmentId)

    if (payload.teacherId) await this.assertTeacherInTenant(tenantId, payload.teacherId)
    if (payload.subjectId) await this.assertSubjectInTenant(tenantId, payload.subjectId)
    if (payload.classId) await this.assertClassInTenant(tenantId, payload.classId)

    await db
      .update(assignments)
      .set({
        teacherId: payload.teacherId ?? current.teacherId,
        subjectId: payload.subjectId ?? current.subjectId,
        classId: payload.classId ?? current.classId,
        title: payload.title ?? current.title,
        description: payload.description === undefined ? current.description : payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : current.dueDate,
        totalPoints: payload.totalPoints ?? current.totalPoints,
        fileUrl: payload.fileUrl === undefined ? current.fileUrl : payload.fileUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(assignments.id, assignmentId), eq(assignments.tenantId, tenantId), isNull(assignments.deletedAt)))

    return this.getById(tenantId, assignmentId)
  }

  async delete(tenantId: string, assignmentId: string): Promise<{ success: true }> {
    await this.findAssignmentOrThrow(tenantId, assignmentId)

    const now = new Date()
    await db
      .update(assignments)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(assignments.id, assignmentId), eq(assignments.tenantId, tenantId), isNull(assignments.deletedAt)))

    await db
      .update(assignmentSubmissions)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.tenantId, tenantId),
          isNull(assignmentSubmissions.deletedAt)
        )
      )

    return { success: true }
  }

  async submit(tenantId: string, assignmentId: string, payload: SubmitAssignmentDto) {
    const assignment = await this.findAssignmentOrThrow(tenantId, assignmentId)
    await this.assertStudentInAssignmentClass(tenantId, assignment.classId, payload.studentId)

    const [existing] = await db
      .select({ id: assignmentSubmissions.id })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.tenantId, tenantId),
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.studentId, payload.studentId),
          isNull(assignmentSubmissions.deletedAt)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(assignmentSubmissions)
        .set({
          fileUrl: payload.fileUrl,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(assignmentSubmissions.id, existing.id))
    } else {
      await db.insert(assignmentSubmissions).values({
        tenantId,
        assignmentId,
        studentId: payload.studentId,
        fileUrl: payload.fileUrl,
        submittedAt: new Date(),
      })
    }

    const submissions = await this.listSubmissions(tenantId, assignmentId, {
      tenantId,
      page: 1,
      limit: 1,
      order: "desc",
      studentId: payload.studentId,
    } as AssignmentQueryDto)

    return { success: true, data: submissions.data[0] ?? null }
  }

  async listSubmissions(tenantId: string, assignmentId: string, query: AssignmentQueryDto) {
    await this.findAssignmentOrThrow(tenantId, assignmentId)
    const filters = this.buildSubmissionFilters({
      tenantId,
      assignmentId,
      studentId: query.studentId,
      search: query.search,
    })

    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(assignmentSubmissions)
      .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(and(...filters))

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await this.listSubmissionRows(filters, query.limit, offset, query.order)

    return {
      data: rows,
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async gradeSubmission(
    tenantId: string,
    assignmentId: string,
    submissionId: string,
    payload: GradeAssignmentSubmissionDto
  ): Promise<AssignmentSubmissionView> {
    const assignment = await this.findAssignmentOrThrow(tenantId, assignmentId)
    const submission = await this.findSubmissionOrThrow(tenantId, assignmentId, submissionId)

    if (payload.score > Number(assignment.totalPoints)) {
      throw new BadRequestException(`score must be between 0 and ${Number(assignment.totalPoints)}`)
    }

    await db
      .update(assignmentSubmissions)
      .set({
        score: String(payload.score),
        feedback: payload.feedback ?? null,
        updatedAt: new Date(),
      })
      .where(eq(assignmentSubmissions.id, submission.id))

    const [updated] = await this.listSubmissionRows(
      this.buildSubmissionFilters({ tenantId, assignmentId, submissionId }),
      1,
      0,
      "desc"
    )

    if (!updated) throw new NotFoundException("Assignment submission not found")
    return updated
  }

  async getOverviewStats(tenantId: string): Promise<AssignmentOverviewStats> {
    const now = new Date()

    const [assignmentCounts] = await db
      .select({
        totalAssignments: sql<number>`count(*)::int`,
        activeAssignments: sql<number>`sum(case when ${assignments.dueDate} >= ${now} then 1 else 0 end)::int`,
        overdueAssignments: sql<number>`sum(case when ${assignments.dueDate} < ${now} then 1 else 0 end)::int`,
      })
      .from(assignments)
      .where(and(eq(assignments.tenantId, tenantId), isNull(assignments.deletedAt)))

    const [submissionCounts] = await db
      .select({
        totalSubmissions: sql<number>`count(*)::int`,
        gradedSubmissions: sql<number>`sum(case when ${assignmentSubmissions.score} is not null then 1 else 0 end)::int`,
      })
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.tenantId, tenantId), isNull(assignmentSubmissions.deletedAt)))

    const [studentCountRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.tenantId, tenantId), isNull(students.deletedAt)))

    const totalAssignments = assignmentCounts?.totalAssignments ?? 0
    const totalSubmissions = submissionCounts?.totalSubmissions ?? 0
    const gradedSubmissions = submissionCounts?.gradedSubmissions ?? 0
    const totalStudents = studentCountRow?.total ?? 0
    const denominator = totalAssignments * totalStudents

    return {
      totalAssignments,
      activeAssignments: assignmentCounts?.activeAssignments ?? 0,
      overdueAssignments: assignmentCounts?.overdueAssignments ?? 0,
      totalSubmissions,
      gradedSubmissions,
      pendingGrading: Math.max(totalSubmissions - gradedSubmissions, 0),
      submissionRate: denominator > 0 ? this.round((totalSubmissions / denominator) * 100) : null,
    }
  }

  async getAssignmentStats(tenantId: string, assignmentId: string): Promise<AssignmentStats> {
    const assignment = await this.getById(tenantId, assignmentId)
    const [classStudentCountRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.tenantId, tenantId), eq(students.classId, assignment.classId), isNull(students.deletedAt)))

    const rows = await this.listSubmissionRows(this.buildSubmissionFilters({ tenantId, assignmentId }))
    const gradedRows = rows.filter((row) => row.score !== null)
    const classStudentCount = classStudentCountRow?.total ?? 0
    const submissionsCount = rows.length
    const gradedCount = gradedRows.length
    const totalScore = gradedRows.reduce((sum, row) => sum + (row.score ?? 0), 0)

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        totalPoints: assignment.totalPoints,
        classId: assignment.classId,
        className: assignment.className,
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
        teacherId: assignment.teacherId,
        teacherName: assignment.teacherName,
      },
      totals: {
        classStudentCount,
        submissionsCount,
        gradedCount,
        pendingSubmissionCount: Math.max(classStudentCount - submissionsCount, 0),
        pendingGradingCount: Math.max(submissionsCount - gradedCount, 0),
        averageScore: gradedCount > 0 ? this.round(totalScore / gradedCount) : null,
        averagePercentage:
          gradedCount > 0 && assignment.totalPoints > 0
            ? this.round((totalScore / (gradedCount * assignment.totalPoints)) * 100)
            : null,
      },
      topSubmissions: gradedRows
        .slice()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.studentName.localeCompare(b.studentName))
        .slice(0, 5)
        .map((row) => ({
          studentId: row.studentId,
          studentName: row.studentName,
          studentCode: row.studentCode,
          score: row.score ?? 0,
          percentage: assignment.totalPoints > 0 ? this.round(((row.score ?? 0) / assignment.totalPoints) * 100) : 0,
          submittedAt: row.submittedAt,
        })),
    }
  }

  private async listSubmissionRows(
    filters: SQL[],
    limit?: number,
    offset?: number,
    order: "asc" | "desc" = "desc"
  ): Promise<AssignmentSubmissionView[]> {
    const sortBySubmittedAt = order === "asc" ? asc(assignmentSubmissions.submittedAt) : desc(assignmentSubmissions.submittedAt)
    const baseQuery = db
      .select({
        id: assignmentSubmissions.id,
        tenantId: assignmentSubmissions.tenantId,
        assignmentId: assignmentSubmissions.assignmentId,
        studentId: students.id,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentCode: students.studentId,
        fileUrl: assignmentSubmissions.fileUrl,
        submittedAt: assignmentSubmissions.submittedAt,
        score: assignmentSubmissions.score,
        feedback: assignmentSubmissions.feedback,
        assignmentDueDate: assignments.dueDate,
        createdAt: assignmentSubmissions.createdAt,
        updatedAt: assignmentSubmissions.updatedAt,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(...filters))
      .orderBy(sortBySubmittedAt, asc(users.firstName), asc(users.lastName))

    const rows =
      typeof limit === "number" && typeof offset === "number"
        ? await baseQuery.limit(limit).offset(offset)
        : await baseQuery

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      studentName: `${row.studentFirstName} ${row.studentLastName}`.trim(),
      studentCode: row.studentCode,
      fileUrl: row.fileUrl,
      submittedAt: row.submittedAt.toISOString(),
      score: row.score === null ? null : Number(row.score),
      feedback: row.feedback,
      isLate: row.submittedAt.getTime() > row.assignmentDueDate.getTime(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  }

  private buildAssignmentFilters(query: AssignmentQueryDto): SQL[] {
    const filters: SQL[] = [
      eq(assignments.tenantId, query.tenantId),
      isNull(assignments.deletedAt),
      isNull(classes.deletedAt),
      isNull(subjects.deletedAt),
      isNull(teachers.deletedAt),
      isNull(users.deletedAt),
    ]

    if (query.classId) filters.push(eq(assignments.classId, query.classId))
    if (query.subjectId) filters.push(eq(assignments.subjectId, query.subjectId))
    if (query.teacherId) filters.push(eq(assignments.teacherId, query.teacherId))
    if (query.studentId) {
      filters.push(
        sql`exists (
          select 1
          from students s
          where s.id = ${query.studentId}
            and s.tenant_id = ${query.tenantId}
            and s.class_id = ${assignments.classId}
            and s.deleted_at is null
        )`
      )
    }
    if (query.dueDateFrom) filters.push(gte(assignments.dueDate, new Date(query.dueDateFrom)))
    if (query.dueDateTo) filters.push(lte(assignments.dueDate, new Date(query.dueDateTo)))
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(assignments.title, `%${search}%`),
            ilike(assignments.description, `%${search}%`),
            ilike(subjects.name, `%${search}%`),
            ilike(classes.name, `%${search}%`),
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`)
          )!
        )
      }
    }

    return filters
  }

  private buildSubmissionFilters(query: {
    tenantId: string
    assignmentId?: string
    submissionId?: string
    studentId?: string
    search?: string
  }): SQL[] {
    const filters: SQL[] = [
      eq(assignmentSubmissions.tenantId, query.tenantId),
      isNull(assignmentSubmissions.deletedAt),
      isNull(assignments.deletedAt),
      isNull(students.deletedAt),
      isNull(users.deletedAt),
    ]

    if (query.assignmentId) filters.push(eq(assignmentSubmissions.assignmentId, query.assignmentId))
    if (query.submissionId) filters.push(eq(assignmentSubmissions.id, query.submissionId))
    if (query.studentId) filters.push(eq(assignmentSubmissions.studentId, query.studentId))

    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`),
            ilike(students.studentId, `%${search}%`)
          )!
        )
      }
    }

    return filters
  }

  private mapAssignmentRow(
    row: AssignmentRow,
    counters?: { submissionsCount: number; gradedCount: number }
  ): AssignmentView {
    return {
      id: row.id,
      tenantId: row.tenantId,
      teacherId: row.teacherId,
      teacherName: `${row.teacherFirstName} ${row.teacherLastName}`.trim(),
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      classId: row.classId,
      className: row.className,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate.toISOString(),
      totalPoints: Number(row.totalPoints),
      fileUrl: row.fileUrl,
      submissionsCount: counters?.submissionsCount ?? 0,
      gradedCount: counters?.gradedCount ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private async getSubmissionCounters(tenantId: string, assignmentIds: string[]) {
    const counters = new Map<string, { submissionsCount: number; gradedCount: number }>()
    if (assignmentIds.length === 0) return counters

    const rows = await db
      .select({
        assignmentId: assignmentSubmissions.assignmentId,
        submissionsCount: sql<number>`count(*)::int`,
        gradedCount: sql<number>`sum(case when ${assignmentSubmissions.score} is not null then 1 else 0 end)::int`,
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.tenantId, tenantId),
          inArray(assignmentSubmissions.assignmentId, assignmentIds),
          isNull(assignmentSubmissions.deletedAt)
        )
      )
      .groupBy(assignmentSubmissions.assignmentId)

    for (const row of rows) {
      counters.set(row.assignmentId, {
        submissionsCount: row.submissionsCount ?? 0,
        gradedCount: row.gradedCount ?? 0,
      })
    }

    return counters
  }

  private async findAssignmentOrThrow(tenantId: string, assignmentId: string) {
    const [row] = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.tenantId, tenantId), isNull(assignments.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Assignment not found")
    return row
  }

  private async findSubmissionOrThrow(tenantId: string, assignmentId: string, submissionId: string) {
    const [row] = await db
      .select({ id: assignmentSubmissions.id })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.id, submissionId),
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.tenantId, tenantId),
          isNull(assignmentSubmissions.deletedAt)
        )
      )
      .limit(1)

    if (!row) throw new NotFoundException("Assignment submission not found")
    return row
  }

  private async assertTeacherInTenant(tenantId: string, teacherId: string): Promise<void> {
    const [row] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(and(eq(teachers.id, teacherId), eq(teachers.tenantId, tenantId), isNull(teachers.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Teacher not found in tenant")
  }

  private async assertSubjectInTenant(tenantId: string, subjectId: string): Promise<void> {
    const [row] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.tenantId, tenantId), isNull(subjects.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Subject not found in tenant")
  }

  private async assertClassInTenant(tenantId: string, classId: string): Promise<void> {
    const [row] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Class not found in tenant")
  }

  private async assertStudentInAssignmentClass(tenantId: string, classId: string, studentId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.tenantId, tenantId),
          eq(students.classId, classId),
          isNull(students.deletedAt)
        )
      )
      .limit(1)

    if (!row) throw new BadRequestException("Student does not belong to assignment class")
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
