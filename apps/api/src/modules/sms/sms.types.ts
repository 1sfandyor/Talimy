export type SmsSendPayload = {
  tenantId: string
  to: string[]
  body: string
  tags?: Record<string, string>
}

export type SmsTemplatePayload = {
  tenantId: string
  to: string[]
  template: "attendance-alert" | "grade-alert" | "notification"
  variables: Record<string, string | number | boolean | null>
  tags?: Record<string, string>
}

export type SmsSendResult = {
  provider: "twilio"
  accepted: number
  messageIds: string[]
  skipped: boolean
}
