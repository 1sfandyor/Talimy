import { z } from "zod"

export const smsTemplateSchema = z.enum(["attendance-alert", "grade-alert", "notification"])

export const smsSendSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().trim().min(3)).min(1).max(100),
  body: z.string().trim().min(1).max(1600),
  tags: z.record(z.string(), z.string()).optional(),
})

export const smsTemplateRenderSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().trim().min(3)).min(1).max(100),
  template: smsTemplateSchema,
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  tags: z.record(z.string(), z.string()).optional(),
})

export const smsJobPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().trim().min(3)).min(1).max(100),
  template: smsTemplateSchema.optional(),
  body: z.string().trim().min(1).max(1600).optional(),
  variables: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
})

export type SmsSendInput = z.infer<typeof smsSendSchema>
export type SmsTemplateRenderInput = z.infer<typeof smsTemplateRenderSchema>
export type SmsJobPayloadInput = z.infer<typeof smsJobPayloadSchema>
