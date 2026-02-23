import { z } from "zod"

export const noticeTargetRoleSchema = z.enum(["all", "teachers", "students", "parents"])
export const noticePrioritySchema = z.enum(["low", "medium", "high", "urgent"])

export const createNoticeSchema = z
  .object({
    tenantId: z.string().uuid(),
    title: z.string().trim().min(1).max(255),
    content: z.string().trim().min(1).max(5000),
    targetRole: noticeTargetRoleSchema,
    priority: noticePrioritySchema.default("medium"),
    publishDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.publishDate || !value.expiryDate) return

    if (new Date(value.expiryDate).getTime() < new Date(value.publishDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "expiryDate must be greater than or equal to publishDate",
      })
    }
  })

export const updateNoticeSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    targetRole: noticeTargetRoleSchema.optional(),
    priority: noticePrioritySchema.optional(),
    publishDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.publishDate || !value.expiryDate) return

    if (new Date(value.expiryDate).getTime() < new Date(value.publishDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "expiryDate must be greater than or equal to publishDate",
      })
    }
  })

export const noticesQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  targetRole: noticeTargetRoleSchema.optional(),
  priority: noticePrioritySchema.optional(),
  role: z.enum(["teachers", "students", "parents"]).optional(),
})

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>
export type NoticesQueryInput = z.infer<typeof noticesQuerySchema>
