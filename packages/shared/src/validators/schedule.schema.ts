import { z } from "zod"

const dayOfWeekSchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid time format. Use HH:mm or HH:mm:ss")

function toSeconds(time: string): number {
  const [hours, minutes, seconds = "0"] = time.split(":")
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
}

export const createScheduleSchema = z
  .object({
    tenantId: z.string().uuid(),
    classId: z.string().uuid(),
    subjectId: z.string().uuid(),
    teacherId: z.string().uuid(),
    dayOfWeek: dayOfWeekSchema,
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    room: z.string().trim().min(1).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (toSeconds(value.startTime) >= toSeconds(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be later than startTime",
      })
    }
  })

export const updateScheduleSchema = z
  .object({
    classId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    dayOfWeek: dayOfWeekSchema.optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    room: z.string().trim().min(1).max(50).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.startTime && value.endTime && toSeconds(value.startTime) >= toSeconds(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be later than startTime",
      })
    }
  })

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
  dayOfWeek: dayOfWeekSchema.optional(),
})

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>
export type ScheduleQueryInput = z.infer<typeof scheduleQuerySchema>
