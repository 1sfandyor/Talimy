import { z } from "zod"

export const notificationTypeSchema = z.enum(["info", "success", "warning", "error"])
export const notificationChannelSchema = z.enum(["in_app", "email", "sms"])

export const sendNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  recipientUserIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  type: notificationTypeSchema.optional(),
  channels: z.array(notificationChannelSchema).min(1).optional(),
})

export const notificationsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  type: notificationTypeSchema.optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
})

export const notificationScopeQuerySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
})

export const markNotificationReadSchema = z.object({
  tenantId: z.string().uuid(),
  read: z.boolean().optional(),
})

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>
export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>
export type NotificationScopeQueryInput = z.infer<typeof notificationScopeQuerySchema>
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>
