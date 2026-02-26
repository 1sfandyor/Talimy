import { z } from "zod"

import { sendNotificationSchema } from "@talimy/shared"

const queueNotificationActorSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  roles: z.array(z.string()).min(1),
})

export const notificationJobPayloadSchema = z.object({
  actor: queueNotificationActorSchema,
  payload: sendNotificationSchema,
})

export type NotificationJobPayload = z.infer<typeof notificationJobPayloadSchema>

export function parseNotificationJobPayload(payload: unknown): NotificationJobPayload {
  return notificationJobPayloadSchema.parse(payload)
}
