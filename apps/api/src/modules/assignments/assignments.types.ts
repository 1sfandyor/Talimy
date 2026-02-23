export type AssignmentView = {
  id: string
  tenantId: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  title: string
  description: string | null
  dueDate: string
  totalPoints: number
  fileUrl: string | null
  submissionsCount: number
  gradedCount: number
  createdAt: string
  updatedAt: string
}

export type AssignmentSubmissionView = {
  id: string
  tenantId: string
  assignmentId: string
  studentId: string
  studentName: string
  studentCode: string
  fileUrl: string | null
  submittedAt: string
  score: number | null
  feedback: string | null
  isLate: boolean
  createdAt: string
  updatedAt: string
}

export type AssignmentOverviewStats = {
  totalAssignments: number
  activeAssignments: number
  overdueAssignments: number
  totalSubmissions: number
  gradedSubmissions: number
  pendingGrading: number
  submissionRate: number | null
}

export type AssignmentStats = {
  assignment: {
    id: string
    title: string
    dueDate: string
    totalPoints: number
    classId: string
    className: string
    subjectId: string
    subjectName: string
    teacherId: string
    teacherName: string
  }
  totals: {
    classStudentCount: number
    submissionsCount: number
    gradedCount: number
    pendingSubmissionCount: number
    pendingGradingCount: number
    averageScore: number | null
    averagePercentage: number | null
  }
  topSubmissions: Array<{
    studentId: string
    studentName: string
    studentCode: string
    score: number
    percentage: number
    submittedAt: string
  }>
}
