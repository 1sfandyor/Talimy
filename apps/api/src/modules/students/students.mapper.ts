import type { classes, students, users } from "@talimy/database"

import type {
  StudentAttendanceItem,
  StudentGradeItem,
  StudentParentItem,
  StudentSummary,
  StudentView,
} from "./students.types"

export function toStudentView(
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

export function toStudentGradeItem(row: {
  id: string
  subject: string
  score: string
  grade: string | null
  comment: string | null
}): StudentGradeItem {
  return {
    id: row.id,
    subject: row.subject,
    score: Number(row.score),
    grade: row.grade,
    comment: row.comment,
  }
}

export function toStudentParentItem(row: {
  id: string
  firstName: string
  lastName: string
  phone: string | null
}): StudentParentItem {
  return {
    id: row.id,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    phone: row.phone,
  }
}

export function createEmptyStudentSummary(): StudentSummary {
  return {
    gradesCount: 0,
    gradeAverage: 0,
    attendance: { present: 0, absent: 0, late: 0, excused: 0 },
    assignments: { total: 0, submitted: 0, pending: 0 },
  }
}

export function normalizeAttendanceItems<T extends StudentAttendanceItem>(items: T[]): T[] {
  return items
}
