import { z } from "zod"

export const eventTypeSchema = z.enum(["academic", "exam", "holiday", "sports", "other"])

export const createEventSchema = z
  .object({
    tenantId: z.string().uuid(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1000).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    location: z.string().trim().max(255).optional(),
    type: eventTypeSchema.default("other"),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endDate).getTime() < new Date(value.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate must be greater than or equal to startDate",
      })
    }
  })

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(1000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    location: z.string().trim().max(255).optional().nullable(),
    type: eventTypeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.endDate) return
    if (new Date(value.endDate).getTime() < new Date(value.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate must be greater than or equal to startDate",
      })
    }
  })

export const eventsQuerySchema = z
  .object({
    tenantId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
    type: eventTypeSchema.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.dateFrom || !value.dateTo) return
    if (new Date(value.dateTo).getTime() < new Date(value.dateFrom).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be greater than or equal to dateFrom",
      })
    }
  })

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventsQueryInput = z.infer<typeof eventsQuerySchema>
