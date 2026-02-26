import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { EmailModule } from "../email/email.module"
import { SmsModule } from "../sms/sms.module"
import { NotificationsController } from "./notifications.controller"
import { NotificationsGateway } from "./notifications.gateway"
import { NotificationsService } from "./notifications.service"

@Module({
  imports: [AuthModule, EmailModule, SmsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
