import { Injectable } from "@nestjs/common"
import type { Job } from "bullmq"

import { SmsService } from "@/modules/sms/sms.service"

import { parseSmsJobPayload, type SmsJobPayload } from "../jobs/sms.job"

@Injectable()
export class SmsProcessor {
  constructor(private readonly smsService: SmsService) {}

  async process(job: Job<SmsJobPayload>) {
    const payload = parseSmsJobPayload(job.data)

    if (payload.template) {
      return this.smsService.sendTemplate({
        tenantId: payload.tenantId,
        to: payload.to,
        template: payload.template,
        variables: payload.variables ?? {},
        tags: payload.tags,
      })
    }

    return this.smsService.send({
      tenantId: payload.tenantId,
      to: payload.to,
      body: payload.body ?? "No content",
      tags: payload.tags,
    })
  }
}
