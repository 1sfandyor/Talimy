import {
  assignmentSubmissions,
  assignments,
  attendance,
  classes,
  db,
  grades,
  parentStudent,
  parents,
  students,
  subjects,
  users,
} from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateStudentDto } from "./dto/create-student.dto"
import { ListStudentsQueryDto } from "./dto/list-students-query.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"

type StudentView = {
  id: string
  tenantId: string
  userId: string
  classId: string | null
  className: string | null
  fullName: string
  email: string
  studentId: string
  gender: "male" | "female"
  dateOfBirth: string | null
  enrollmentDate: string
  status: "active" | "inactive" | "graduated" | "transferred"
  bloodGroup: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class StudentsService {
  async list(query: ListStudentsQueryDto): Promise<{
    data: StudentView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [eq(students.tenantId, query.tenantId), isNull(students.deletedAt)]
    if (query.classId) {
      filters.push(eq(students.classId, query.classId))
    }
    if (query.gender) {
      filters.push(eq(students.gender, query.gender))
    }
    if (query.status) {
      filters.push(eq(students.status, query.status))
    }
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(
          or(
            ilike(students.studentId, `%${search}%`),
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
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0

    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const rows = await db
      .select({
        student: students,
        user: users,
        class: classes,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => this.toStudentView(row.student, row.user, row.class)),
      meta: {
        page,
        limit: query.limit,
        total,
        totalPages,
      },
    }
  }

  async getById(tenantId: string, id: string): Promise<StudentView> {
    const row = await this.findStudentRowOrThrow(tenantId, id)
    return this.toStudentView(row.student, row.user, row.class)
  }

  async create(payload: CreateStudentDto): Promise<StudentView> {
    const user = await this.findUserOrThrow(payload.tenantId, payload.userId)
    await this.assertUniqueStudentCode(payload.tenantId, payload.studentId)
    await this.assertUserNotStudent(payload.tenantId, payload.userId)
    if (payload.classId) {
      await this.assertClassInTenant(payload.tenantId, payload.classId)
    }

    const [created] = await db
      .insert(students)
      .values({
        tenantId: payload.tenantId,
        userId: payload.userId,
        classId: payload.classId ?? null,
        studentId: payload.studentId,
        gender: payload.gender,
        dateOfBirth: payload.dateOfBirth,
        enrollmentDate: payload.enrollmentDate,
        status: payload.status ?? "active",
        bloodGroup: payload.bloodGroup,
        address: payload.address,
      })
      .returning()

    if (!created) {
      throw new BadRequestException("Failed to create student")
    }

    const classRow = payload.classId ? await this.findClassOptional(payload.classId) : null
    return this.toStudentView(created, user, classRow)
  }

  async update(tenantId: string, id: string, payload: UpdateStudentDto): Promise<StudentView> {
    const current = await this.findStudentRowOrThrow(tenantId, id)

    if (payload.studentId && payload.studentId !== current.student.studentId) {
      await this.assertUniqueStudentCode(tenantId, payload.studentId, id)
    }
    if (payload.classId) {
      await this.assertClassInTenant(tenantId, payload.classId)
    }

    const updatePayload: Partial<typeof students.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (payload.studentId) {
      updatePayload.studentId = payload.studentId
    }
    if (typeof payload.classId !== "undefined") {
      updatePayload.classId = payload.classId
    }
    if (payload.gender) {
      updatePayload.gender = payload.gender
    }
    if (typeof payload.dateOfBirth !== "undefined") {
      updatePayload.dateOfBirth = payload.dateOfBirth
    }
    if (payload.enrollmentDate) {
      updatePayload.enrollmentDate = payload.enrollmentDate
    }
    if (payload.status) {
      updatePayload.status = payload.status
    }
    if (typeof payload.bloodGroup !== "undefined") {
      updatePayload.bloodGroup = payload.bloodGroup
    }
    if (typeof payload.address !== "undefined") {
      updatePayload.address = payload.address
    }

    const [updated] = await db
      .update(students)
      .set(updatePayload)
      .where(and(eq(students.id, id), eq(students.tenantId, tenantId), isNull(students.deletedAt)))
      .returning()

    if (!updated) {
      throw new NotFoundException("Student not found")
    }

    const classRow = updated.classId ? await this.findClassOptional(updated.classId) : null
    return this.toStudentView(updated, current.user, classRow)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findStudentRowOrThrow(tenantId, id)
    await db
      .update(students)
      .set({
        status: "inactive",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(students.id, id), eq(students.tenantId, tenantId), isNull(students.deletedAt)))
    return { success: true }
  }

  async getGrades(
    tenantId: string,
    id: string
  ): Promise<
    Array<{
      id: string
      subject: string
      score: number
      grade: string | null
      comment: string | null
    }>
  > {
    await this.findStudentRowOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: grades.id,
        subject: subjects.name,
        score: grades.score,
        grade: grades.grade,
        comment: grades.comment,
      })
      .from(grades)
      .innerJoin(subjects, eq(subjects.id, grades.subjectId))
      .where(and(eq(grades.tenantId, tenantId), eq(grades.studentId, id), isNull(grades.deletedAt)))
      .orderBy(desc(grades.createdAt))

    return rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      score: Number(row.score),
      grade: row.grade,
      comment: row.comment,
    }))
  }

  async getAttendance(
    tenantId: string,
    id: string
  ): Promise<
    Array<{
      id: string
      date: string
      status: "present" | "absent" | "late" | "excused"
      note: string | null
    }>
  > {
    await this.findStudentRowOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        note: attendance.note,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.studentId, id),
          isNull(attendance.deletedAt)
        )
      )
      .orderBy(desc(attendance.date))

    return rows
  }

  async getParents(
    tenantId: string,
    id: string
  ): Promise<Array<{ id: string; fullName: string; phone: string | null }>> {
    await this.findStudentRowOrThrow(tenantId, id)
    const rows = await db
      .select({
        id: parents.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: parents.phone,
      })
      .from(parentStudent)
      .innerJoin(parents, eq(parents.id, parentStudent.parentId))
      .innerJoin(users, eq(users.id, parents.userId))
      .where(
        and(
          eq(parentStudent.tenantId, tenantId),
          eq(parentStudent.studentId, id),
          isNull(parentStudent.deletedAt),
          isNull(parents.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .orderBy(asc(users.firstName), asc(users.lastName))

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      phone: row.phone,
    }))
  }

  async getSummary(
    tenantId: string,
    id: string
  ): Promise<{
    gradesCount: number
    gradeAverage: number
    attendance: { present: number; absent: number; late: number; excused: number }
    assignments: { total: number; submitted: number; pending: number }
  }> {
    const studentRow = await this.findStudentRowOrThrow(tenantId, id)

    const gradeRows = await db
      .select({
        count: sql<number>`count(*)::int`,
        avg: sql<string>`coalesce(avg(${grades.score}), 0)`,
      })
      .from(grades)
      .where(and(eq(grades.tenantId, tenantId), eq(grades.studentId, id), isNull(grades.deletedAt)))
    const gradesCount = gradeRows[0]?.count ?? 0
    const gradeAverage = Number(gradeRows[0]?.avg ?? "0")

    const attendanceRows = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.studentId, id),
          isNull(attendance.deletedAt)
        )
      )
      .groupBy(attendance.status)

    const attendanceSummary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }
    for (const row of attendanceRows) {
      attendanceSummary[row.status] = row.count
    }

    let assignmentsTotal = 0
    if (studentRow.student.classId) {
      const assignmentRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assignments)
        .where(
          and(
            eq(assignments.tenantId, tenantId),
            eq(assignments.classId, studentRow.student.classId),
            isNull(assignments.deletedAt)
          )
        )
      assignmentsTotal = assignmentRows[0]?.count ?? 0
    }

    const submissionRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.tenantId, tenantId),
          eq(assignmentSubmissions.studentId, id),
          isNull(assignmentSubmissions.deletedAt)
        )
      )
    const submitted = submissionRows[0]?.count ?? 0
    const pending = Math.max(0, assignmentsTotal - submitted)

    return {
      gradesCount,
      gradeAverage,
      attendance: attendanceSummary,
      assignments: {
        total: assignmentsTotal,
        submitted,
        pending,
      },
    }
  }

  private async findStudentRowOrThrow(
    tenantId: string,
    studentId: string
  ): Promise<{
    student: typeof students.$inferSelect
    user: typeof users.$inferSelect
    class: typeof classes.$inferSelect | null
  }> {
    const [row] = await db
      .select({
        student: students,
        user: users,
        class: classes,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(classes, eq(classes.id, students.classId))
      .where(
        and(eq(students.id, studentId), eq(students.tenantId, tenantId), isNull(students.deletedAt))
      )
      .limit(1)

    if (!row) {
      throw new NotFoundException("Student not found")
    }
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
    if (!row) {
      throw new NotFoundException("Student user account not found in tenant")
    }
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
    if (!row) {
      throw new BadRequestException("Class not found in tenant")
    }
  }

  private async findClassOptional(classId: string): Promise<typeof classes.$inferSelect | null> {
    const [row] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)))
      .limit(1)
    return row ?? null
  }

  private async assertUniqueStudentCode(
    tenantId: string,
    studentCode: string,
    ignoreStudentId?: string
  ): Promise<void> {
    const filters: SQL[] = [
      eq(students.tenantId, tenantId),
      eq(students.studentId, studentCode),
      isNull(students.deletedAt),
    ]
    if (ignoreStudentId) {
      filters.push(ne(students.id, ignoreStudentId))
    }
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(...filters))
      .limit(1)
    if (row) {
      throw new BadRequestException("Student ID already exists")
    }
  }

  private async assertUserNotStudent(tenantId: string, userId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.userId, userId),
          isNull(students.deletedAt)
        )
      )
      .limit(1)
    if (row) {
      throw new BadRequestException("User already linked to another student record")
    }
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "studentId":
        return students.studentId
      case "gender":
        return students.gender
      case "status":
        return students.status
      case "enrollmentDate":
        return students.enrollmentDate
      case "updatedAt":
        return students.updatedAt
      case "createdAt":
      default:
        return students.createdAt
    }
  }

  private toStudentView(
    student: typeof students.$inferSelect,
    user: typeof users.$inferSelect,
    classRow: typeof classes.$inferSelect | null
  ): StudentView {
    return {
      id: student.id,
      tenantId: student.tenantId,
      userId: student.userId,
      classId: student.classId,
      className: classRow?.name ?? null,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      studentId: student.studentId,
      gender: student.gender as "male" | "female",
      dateOfBirth: student.dateOfBirth,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      bloodGroup: student.bloodGroup,
      address: student.address,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }
  }
}
