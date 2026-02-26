import { Module } from "@nestjs/common"

import { AiModule } from "@/modules/ai/ai.module"
import { EmailModule } from "@/modules/email/email.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { SmsModule } from "@/modules/sms/sms.module"

import { AttendanceAlertsProcessor } from "./processors/attendance-alerts.processor"
import { EmailProcessor } from "./processors/email.processor"
import { NotificationProcessor } from "./processors/notification.processor"
import { ReportProcessor } from "./processors/report.processor"
import { SmsProcessor } from "./processors/sms.processor"
import { QueueWorkersService } from "./queue-workers.service"

@Module({
  imports: [EmailModule, SmsModule, NotificationsModule, AiModule],
  providers: [
    AttendanceAlertsProcessor,
    EmailProcessor,
    SmsProcessor,
    NotificationProcessor,
    ReportProcessor,
    QueueWorkersService,
  ],
  exports: [QueueWorkersService],
})
export class QueueModule {}
