import { smsJobPayloadSchema, type SmsJobPayloadInput } from "@talimy/shared"

export type SmsJobPayload = SmsJobPayloadInput

export function parseSmsJobPayload(payload: unknown): SmsJobPayload {
  return smsJobPayloadSchema.parse(payload)
}
