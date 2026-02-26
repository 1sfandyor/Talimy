import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { emailSendSchema, emailTemplateRenderSchema } from "@talimy/shared"

import type { EmailSendPayload, EmailSendResult, EmailTemplatePayload } from "./email.types"
import { EmailTemplatesService } from "./email.templates"

@Injectable()
export class EmailService {
  private readonly baseUrl = process.env.RESEND_BASE_URL?.trim() || "https://api.resend.com"
  private readonly fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "noreply@talimy.space"

  constructor(private readonly templates: EmailTemplatesService) {}

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    const body = emailSendSchema.parse(payload)
    const apiKey = this.requireApiKey()

    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: body.to,
        subject: body.subject,
        html: body.html,
        text: body.text,
        tags: body.tags
          ? Object.entries(body.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      }),
    })

    const text = await res.text()
    const json = this.tryJson(text)
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `Resend API failed (${res.status}): ${this.extractError(json, text)}`
      )
    }

    const jsonObj =
      typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null
    const dataObj =
      jsonObj && typeof jsonObj.data === "object" && jsonObj.data !== null
        ? (jsonObj.data as Record<string, unknown>)
        : null
    const id =
      (jsonObj && typeof jsonObj.id === "string" && jsonObj.id) ||
      (dataObj && typeof dataObj.id === "string" && dataObj.id) ||
      null
    return {
      provider: "resend",
      accepted: body.to.length,
      messageIds: id ? [id] : [],
      skipped: false,
    }
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

  private tryJson(text: string): unknown {
    try {
      return text ? JSON.parse(text) : null
    } catch {
      return null
    }
  }

  private extractError(json: unknown, text: string): string {
    const obj = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {}
    const nestedError =
      typeof obj.error === "object" && obj.error !== null
        ? (obj.error as Record<string, unknown>)
        : null
    const message =
      (typeof obj.message === "string" && obj.message) ||
      (nestedError && typeof nestedError.message === "string" && nestedError.message) ||
      (typeof obj.name === "string" && obj.name)
    return message || text.slice(0, 300) || "unknown error"
  }
}
