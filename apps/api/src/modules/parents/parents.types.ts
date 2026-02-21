export type ParentView = {
  id: string
  tenantId: string
  userId: string
  fullName: string
  email: string
  phone: string | null
  occupation: string | null
  address: string | null
  relationship: string
  createdAt: Date
  updatedAt: Date
}

export type ParentChildView = {
  id: string
  fullName: string
  studentId: string
  className: string | null
  attendanceCount: number
  gradesCount: number
  averageGrade: number
}
