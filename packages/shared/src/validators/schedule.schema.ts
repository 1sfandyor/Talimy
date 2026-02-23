import { z } from "zod"

export const scheduleQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  dayOfWeek: z
    .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
    .optional(),
})

export type ScheduleQueryInput = z.infer<typeof scheduleQuerySchema>
