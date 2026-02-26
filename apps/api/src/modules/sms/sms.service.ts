import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { smsSendSchema, smsTemplateRenderSchema } from "@talimy/shared"
import Twilio from "twilio"

import type { SmsSendPayload, SmsSendResult, SmsTemplatePayload } from "./sms.types"
import { SmsTemplatesService } from "./sms.templates"

@Injectable()
export class SmsService {
  private clientCache = new Map<string, Twilio.Twilio>()
  private readonly fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || ""

  constructor(private readonly templates: SmsTemplatesService) {}

  async send(payload: SmsSendPayload): Promise<SmsSendResult> {
    const body = smsSendSchema.parse(payload)
    const client = this.getClient()
    const messageIds: string[] = []

    for (const to of body.to) {
      const sent = await client.messages.create({
        to,
        from: this.requireFromNumber(),
        body: body.body,
      })
      if (sent.sid) {
        messageIds.push(sent.sid)
      }
    }

    return {
      provider: "twilio",
      accepted: body.to.length,
      messageIds,
      skipped: false,
    }
  }

  async sendTemplate(payload: SmsTemplatePayload): Promise<SmsSendResult> {
    const parsed = smsTemplateRenderSchema.parse(payload)
    const rendered = this.templates.render(parsed.template, parsed.variables)
    return this.send({
      tenantId: parsed.tenantId,
      to: parsed.to,
      body: rendered.body,
      tags: parsed.tags,
    })
  }

  async sendNotificationSms(input: {
    tenantId: string
    to: string[]
    title: string
    message: string
  }): Promise<number> {
    if (input.to.length === 0) return 0
    if (!process.env.TWILIO_ACCOUNT_SID?.trim() || !process.env.TWILIO_AUTH_TOKEN?.trim()) return 0
    if (!process.env.TWILIO_PHONE_NUMBER?.trim()) return 0

    const result = await this.sendTemplate({
      tenantId: input.tenantId,
      to: input.to,
      template: "notification",
      variables: {
        title: input.title,
        message: input.message,
      },
      tags: { module: "notifications", kind: "in-app-mirror" },
    })
    return result.accepted
  }

  private getClient(): Twilio.Twilio {
    const sid = this.requireAccountSid()
    const existing = this.clientCache.get(sid)
    if (existing) return existing
    const client = Twilio(sid, this.requireAuthToken())
    this.clientCache.set(sid, client)
    return client
  }

  private requireAccountSid(): string {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
    if (!sid) throw new ServiceUnavailableException("TWILIO_ACCOUNT_SID is not configured")
    return sid
  }

  private requireAuthToken(): string {
    const token = process.env.TWILIO_AUTH_TOKEN?.trim()
    if (!token) throw new ServiceUnavailableException("TWILIO_AUTH_TOKEN is not configured")
    return token
  }

  private requireFromNumber(): string {
    if (!this.fromNumber) {
      throw new ServiceUnavailableException("TWILIO_PHONE_NUMBER is not configured")
    }
    return this.fromNumber
  }
}
