import { emailJobPayloadSchema, type EmailJobPayloadInput } from "@talimy/shared"

export type EmailJobPayload = EmailJobPayloadInput

export function parseEmailJobPayload(payload: unknown): EmailJobPayload {
  return emailJobPayloadSchema.parse(payload)
}
