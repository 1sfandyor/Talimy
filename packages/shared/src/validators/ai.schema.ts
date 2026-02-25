import { z } from "zod"

export const aiChatMessageRoleSchema = z.enum(["system", "user", "assistant"])

export const aiChatMessageSchema = z.object({
  role: aiChatMessageRoleSchema,
  content: z.string().trim().min(1).max(10000),
})

export const aiChatSchema = z.object({
  tenantId: z.string().uuid(),
  messages: z.array(aiChatMessageSchema).min(1).max(50),
  model: z.string().trim().min(1).max(80).optional(),
  maxTokens: z.coerce.number().int().min(64).max(4096).optional(),
  temperature: z.coerce.number().min(0).max(1).optional(),
})

export const aiInsightTypeSchema = z.enum([
  "motivation",
  "study_strategy",
  "risk_alert",
  "progress_summary",
])

export const aiInsightsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  type: aiInsightTypeSchema.optional(),
  regenerate: z.coerce.boolean().optional().default(false),
})

export const aiReportTypeSchema = z.enum([
  "attendance_overview",
  "grades_overview",
  "finance_overview",
  "school_summary",
])

export const aiReportGenerateSchema = z.object({
  tenantId: z.string().uuid(),
  type: aiReportTypeSchema,
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export type AiChatInput = z.infer<typeof aiChatSchema>
export type AiInsightsQueryInput = z.infer<typeof aiInsightsQuerySchema>
export type AiReportGenerateInput = z.infer<typeof aiReportGenerateSchema>
