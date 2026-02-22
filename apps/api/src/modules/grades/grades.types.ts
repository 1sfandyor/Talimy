export type GradeListItem = {
  id: string
  tenantId: string
  studentId: string
  studentName: string
  studentCode: string
  classId: string | null
  className: string | null
  subjectId: string
  subjectName: string
  termId: string
  termName: string
  teacherId: string | null
  teacherName: string | null
  score: number
  grade: string | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

export type GradeScaleView = {
  id: string
  tenantId: string
  name: string
  minScore: number
  maxScore: number
  grade: string
  gpa: number | null
}

export type GradeReport = {
  period: {
    termId: string | null
    subjectId: string | null
    classId: string | null
    studentId: string | null
  }
  totals: {
    count: number
    averageScore: number | null
    minScore: number | null
    maxScore: number | null
  }
  byStudent: Array<{
    studentId: string
    studentName: string
    studentCode: string
    gradesCount: number
    averageScore: number
    averageGpa: number | null
  }>
  bySubject: Array<{
    subjectId: string
    subjectName: string
    gradesCount: number
    averageScore: number
  }>
}
