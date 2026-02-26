import { Module } from "@nestjs/common"

import { EmailQueueService } from "./email-queue.service"
import { EmailService } from "./email.service"
import { EmailTemplatesService } from "./email.templates"
import { EmailProcessor } from "../queue/processors/email.processor"

@Module({
  providers: [EmailService, EmailTemplatesService, EmailQueueService, EmailProcessor],
  exports: [EmailService, EmailTemplatesService, EmailQueueService, EmailProcessor],
})
export class EmailModule {}
