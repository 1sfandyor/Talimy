import { z } from "zod"

export const emailTemplateSchema = z.enum(["welcome", "password-reset", "invoice", "notification"])

export const emailSendSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().email()).min(1).max(100),
  subject: z.string().trim().min(1).max(255),
  html: z.string().trim().min(1),
  text: z.string().trim().min(1).optional(),
  tags: z.record(z.string(), z.string()).optional(),
})

export const emailTemplateRenderSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().email()).min(1).max(100),
  template: emailTemplateSchema,
  subject: z.string().trim().min(1).max(255).optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  tags: z.record(z.string(), z.string()).optional(),
})

export const emailJobPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  to: z.array(z.string().email()).min(1).max(100),
  template: emailTemplateSchema.optional(),
  subject: z.string().trim().min(1).max(255),
  html: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).optional(),
  variables: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  tags: z.record(z.string(), z.string()).optional(),
})

export type EmailSendInput = z.infer<typeof emailSendSchema>
export type EmailTemplateRenderInput = z.infer<typeof emailTemplateRenderSchema>
export type EmailJobPayloadInput = z.infer<typeof emailJobPayloadSchema>
