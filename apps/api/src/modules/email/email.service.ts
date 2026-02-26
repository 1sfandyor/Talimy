import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { emailSendSchema, emailTemplateRenderSchema } from "@talimy/shared"
import { Resend } from "resend"

import type { EmailSendPayload, EmailSendResult, EmailTemplatePayload } from "./email.types"
import { EmailTemplatesService } from "./email.templates"

@Injectable()
export class EmailService {
  private readonly fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "noreply@talimy.space"
  private clientCache = new Map<string, Resend>()

  constructor(private readonly templates: EmailTemplatesService) {}

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    const body = emailSendSchema.parse(payload)
    const client = this.getClient()
    const { data, error } = await client.emails.send({
      from: this.fromEmail,
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      tags: body.tags
        ? Object.entries(body.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    })

    if (error) {
      throw new ServiceUnavailableException(`Resend API failed: ${error.message}`)
    }

    const id = typeof data?.id === "string" ? data.id : null
    return {
      provider: "resend",
      accepted: body.to.length,
      messageIds: id ? [id] : [],
      skipped: false,
    }
  }

  private getClient(): Resend {
    const apiKey = this.requireApiKey()
    const existing = this.clientCache.get(apiKey)
    if (existing) return existing
    const client = new Resend(apiKey)
    this.clientCache.set(apiKey, client)
    return client
  }

  async sendTemplate(payload: EmailTemplatePayload): Promise<EmailSendResult> {
    const parsed = emailTemplateRenderSchema.parse(payload)
    const rendered = this.templates.render(parsed.template, parsed.variables, parsed.subject)
    return this.send({
      tenantId: parsed.tenantId,
      to: parsed.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: parsed.tags,
    })
  }

  async sendNotificationEmails(input: {
    tenantId: string
    to: string[]
    title: string
    message: string
  }): Promise<number> {
    if (input.to.length === 0) return 0
    if (!process.env.RESEND_API_KEY?.trim()) return 0

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

  private requireApiKey(): string {
    const key = process.env.RESEND_API_KEY?.trim()
    if (!key) {
      throw new ServiceUnavailableException("RESEND_API_KEY is not configured")
    }
    return key
  }
}
