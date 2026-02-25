import type { StudentInsightRow } from "./ai.types"

export function buildStudentInsightPrompt(input: {
  insightType: string
  student: {
    firstName: string
    lastName: string
    studentCode: string
    status: string
    gender: string
    enrollmentDate: string | null
  }
  gradeCount: number
  averageScore: string | number | null
  attendanceTotal: number
  absentCount: number
  lateCount: number
}): string {
  const { student } = input
  return [
    "You are an educational assistant for a school management system.",
    "Generate concise, practical student insight in Uzbek Latin script.",
    `Insight type: ${input.insightType}`,
    `Student: ${student.firstName} ${student.lastName}`,
    `Student code: ${student.studentCode}`,
    `Status: ${student.status}`,
    `Gender: ${student.gender}`,
    `Enrollment date: ${student.enrollmentDate ?? "n/a"}`,
    `Grade count: ${input.gradeCount}`,
    `Average score: ${input.averageScore ?? "n/a"}`,
    `Attendance total: ${input.attendanceTotal}`,
    `Attendance absences: ${input.absentCount}`,
    `Attendance late: ${input.lateCount}`,
    "Return 3-6 short bullet-like recommendations as plain text.",
  ].join("\n")
}

export function estimateInsightConfidence(gradeCount: number, attendanceCount: number): string {
  const score = Math.min(
    0.99,
    0.4 + Math.min(gradeCount, 20) * 0.02 + Math.min(attendanceCount, 60) * 0.005
  )
  return score.toFixed(2)
}

export function mapInsightRow(row: StudentInsightRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    studentId: row.studentId,
    type: row.type,
    content: row.content,
    confidence: row.confidence ? Number(row.confidence) : null,
    generatedAt: row.generatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
