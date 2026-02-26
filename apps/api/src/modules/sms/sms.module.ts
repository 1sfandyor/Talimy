import { Module } from "@nestjs/common"

import { SmsService } from "./sms.service"
import { SmsTemplatesService } from "./sms.templates"

@Module({
  providers: [SmsTemplatesService, SmsService],
  exports: [SmsTemplatesService, SmsService],
})
export class SmsModule {}
