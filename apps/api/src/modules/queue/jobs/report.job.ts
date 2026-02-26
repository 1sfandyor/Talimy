import { z } from "zod"

import { aiReportGenerateSchema } from "@talimy/shared"

const queueReportActorSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  roles: z.array(z.string()).min(1),
})

export const reportJobPayloadSchema = z.object({
  actor: queueReportActorSchema,
  payload: aiReportGenerateSchema,
})

export type ReportJobPayload = z.infer<typeof reportJobPayloadSchema>

export function parseReportJobPayload(payload: unknown): ReportJobPayload {
  return reportJobPayloadSchema.parse(payload)
}
