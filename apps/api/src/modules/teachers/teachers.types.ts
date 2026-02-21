import type { dayOfWeekEnum } from "@talimy/database"

export type TeacherView = {
  id: string
  tenantId: string
  userId: string
  fullName: string
  email: string
  employeeId: string
  gender: "male" | "female"
  joinDate: string
  dateOfBirth: string | null
  qualification: string | null
  specialization: string | null
  salary: number | null
  status: "active" | "inactive" | "on_leave"
  createdAt: Date
  updatedAt: Date
}

export type TeacherScheduleItem = {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  dayOfWeek: (typeof dayOfWeekEnum.enumValues)[number]
  startTime: string
  endTime: string
  room: string | null
}
