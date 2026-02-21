export type AttendanceItem = {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  classId: string
  className: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  note: string | null
  markedBy: string | null
  markedByName: string | null
}

export type AttendanceReport = {
  period: { from: string | null; to: string | null }
  totals: { present: number; absent: number; late: number; excused: number; all: number }
  byDay: Array<{
    date: string
    present: number
    absent: number
    late: number
    excused: number
    all: number
  }>
}
