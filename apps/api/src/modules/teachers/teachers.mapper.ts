import type { teachers, users } from "@talimy/database"

import type { TeacherView } from "./teachers.types"

export function toTeacherView(
  teacher: typeof teachers.$inferSelect,
  user: typeof users.$inferSelect
): TeacherView {
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  return {
    id: teacher.id,
    tenantId: teacher.tenantId,
    userId: teacher.userId,
    fullName,
    email: user.email,
    employeeId: teacher.employeeId,
    gender: teacher.gender as "male" | "female",
    joinDate: teacher.joinDate,
    dateOfBirth: teacher.dateOfBirth,
    qualification: teacher.qualification,
    specialization: teacher.specialization,
    salary: teacher.salary === null ? null : Number(teacher.salary),
    status: teacher.status,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  }
}
