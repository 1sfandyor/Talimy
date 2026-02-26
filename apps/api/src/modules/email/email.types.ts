import type { EmailJobPayloadInput, EmailSendInput, EmailTemplateRenderInput } from "@talimy/shared"

export type EmailTemplateName = EmailTemplateRenderInput["template"]
export type EmailSendPayload = EmailSendInput
export type EmailTemplatePayload = EmailTemplateRenderInput
export type EmailJobPayload = EmailJobPayloadInput

export type EmailSendResult = {
  provider: "resend"
  accepted: number
  messageIds: string[]
  skipped: boolean
}

export type EmailTemplateRenderResult = {
  subject: string
  html: string
  text: string
}
