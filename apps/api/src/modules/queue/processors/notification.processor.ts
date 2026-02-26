import { Injectable } from "@nestjs/common"
import type { Job } from "bullmq"

import { NotificationsService } from "@/modules/notifications/notifications.service"

import { parseNotificationJobPayload, type NotificationJobPayload } from "../jobs/notification.job"

@Injectable()
export class NotificationProcessor {
  constructor(private readonly notificationsService: NotificationsService) {}

  async process(job: Job<NotificationJobPayload>) {
    const { actor, payload } = parseNotificationJobPayload(job.data)
    return this.notificationsService.send(actor, payload)
  }
}
