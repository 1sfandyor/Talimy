/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { SmsService } from "./sms.service"
import { SmsTemplatesService } from "./sms.templates"

test("SmsService sendNotificationSms returns 0 when Twilio env is missing", async () => {
  const originalSid = process.env.TWILIO_ACCOUNT_SID
  const originalToken = process.env.TWILIO_AUTH_TOKEN
  const originalPhone = process.env.TWILIO_PHONE_NUMBER
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_AUTH_TOKEN
  delete process.env.TWILIO_PHONE_NUMBER

  try {
    const service = new SmsService(new SmsTemplatesService())
    const dispatched = await service.sendNotificationSms({
      tenantId: "11111111-1111-1111-1111-111111111111",
      to: ["+998901112233"],
      title: "Notice",
      message: "Hello",
    })
    assert.equal(dispatched, 0)
  } finally {
    process.env.TWILIO_ACCOUNT_SID = originalSid
    process.env.TWILIO_AUTH_TOKEN = originalToken
    process.env.TWILIO_PHONE_NUMBER = originalPhone
  }
})
