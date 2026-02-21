import { z } from "zod"

const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"])

export const attendanceQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  classId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  status: attendanceStatusSchema.optional(),
})

export const markAttendanceSchema = z.object({
  tenantId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.string().date(),
  markedBy: z.string().uuid().optional(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatusSchema,
        note: z.string().max(500).optional(),
      })
    )
    .min(1),
})

export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>
