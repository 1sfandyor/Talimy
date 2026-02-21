import type { dayOfWeekEnum } from "@talimy/database"

export type ClassView = {
  id: string
  tenantId: string
  name: string
  grade: string
  section: string | null
  capacity: number
  academicYearId: string
  studentsCount: number
  createdAt: Date
  updatedAt: Date
}

export type ClassStudentView = {
  id: string
  fullName: string
  studentId: string
  gender: "male" | "female"
  status: "active" | "inactive" | "graduated" | "transferred"
}

export type ClassTeacherView = {
  id: string
  fullName: string
  employeeId: string
  subjectCount: number
}

export type ClassScheduleItem = {
  id: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  dayOfWeek: (typeof dayOfWeekEnum.enumValues)[number]
  startTime: string
  endTime: string
  room: string | null
}

export type ClassStatsView = {
  classId: string
  studentsCount: number
  teachersCount: number
  schedulesCount: number
  capacity: number
  capacityUsagePercent: number
}
