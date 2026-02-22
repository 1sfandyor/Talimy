export type ExamView = {
  id: string
  tenantId: string
  name: string
  type: "midterm" | "final" | "quiz" | "custom"
  subjectId: string
  subjectName: string
  classId: string
  className: string
  date: string
  totalMarks: number
  duration: number
  resultsCount?: number
  createdAt: string
  updatedAt: string
}

export type ExamResultView = {
  id: string
  tenantId: string
  examId: string
  examName: string
  examType: string
  examDate: string
  totalMarks: number
  studentId: string
  studentName: string
  studentCode: string
  score: number
  percentage: number
  grade: string | null
  rank: string | null
  createdAt: string
  updatedAt: string
}

export type ExamStats = {
  exam: {
    id: string
    name: string
    type: string
    date: string
    totalMarks: number
    classId: string
    className: string
    subjectId: string
    subjectName: string
  }
  totals: {
    resultsCount: number
    averageScore: number | null
    highestScore: number | null
    lowestScore: number | null
    averagePercentage: number | null
  }
  topPerformers: Array<{
    studentId: string
    studentName: string
    studentCode: string
    score: number
    percentage: number
    grade: string | null
    rank: string | null
  }>
}
