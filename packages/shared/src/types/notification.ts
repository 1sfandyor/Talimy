export type {
  SendNotificationInput,
  NotificationsQueryInput,
  NotificationScopeQueryInput,
  MarkNotificationReadInput,
} from "../validators/notification.schema"

export type NotificationType = "info" | "success" | "warning" | "error"
export type NotificationChannel = "in_app" | "email" | "sms"
