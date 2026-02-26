import { Injectable } from "@nestjs/common"
import type { Job } from "bullmq"

import { EmailService } from "@/modules/email/email.service"

import { parseEmailJobPayload, type EmailJobPayload } from "../jobs/email.job"

@Injectable()
export class EmailProcessor {
  constructor(private readonly emailService: EmailService) {}

  async process(job: Job<EmailJobPayload>) {
    const payload = parseEmailJobPayload(job.data)

    if (payload.template) {
      return this.emailService.sendTemplate({
        tenantId: payload.tenantId,
        to: payload.to,
        template: payload.template,
        subject: payload.subject,
        variables: payload.variables ?? {},
        tags: payload.tags,
      })
    }

    return this.emailService.send({
      tenantId: payload.tenantId,
      to: payload.to,
      subject: payload.subject,
      html: payload.html ?? "<p>No content</p>",
      text: payload.text,
      tags: payload.tags,
    })
  }
}
