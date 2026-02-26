import { z } from "zod"

export const auditLogsQuerySchema = z
  .object({
    tenantId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(100).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    resource: z.string().trim().min(1).max(100).optional(),
    userId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    sort: z.enum(["timestamp", "createdAt", "action", "resource"]).default("timestamp"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "to must be greater than or equal to from",
      })
    }
  })

export type AuditLogsQueryInput = z.infer<typeof auditLogsQuerySchema>
