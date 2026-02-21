export type StudentView = {
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

export type StudentGradeItem = {
  id: string
  subject: string
  score: number
  grade: string | null
  comment: string | null
}

export type StudentAttendanceItem = {
  id: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  note: string | null
}

export type StudentParentItem = {
  id: string
  fullName: string
  phone: string | null
}

export type StudentSummary = {
  gradesCount: number
  gradeAverage: number
  attendance: { present: number; absent: number; late: number; excused: number }
  assignments: { total: number; submitted: number; pending: number }
}
