/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"
import type { Job } from "bullmq"

import { EmailProcessor } from "../queue/processors/email.processor"
import type { EmailService } from "./email.service"
import type { EmailJobPayload } from "../queue/jobs/email.job"

test("EmailProcessor routes template jobs to sendTemplate", async () => {
  let called = ""
  const service = {
    async sendTemplate() {
      called = "template"
      return { accepted: 1 }
    },
    async send() {
      called = "send"
      return { accepted: 1 }
    },
  } as unknown as EmailService

  const processor = new EmailProcessor(service)
  await processor.process({
    data: {
      tenantId: "11111111-1111-4111-8111-111111111111",
      to: ["user@example.com"],
      template: "notification",
      subject: "Subject",
      variables: { title: "A", message: "B" },
    },
  } as unknown as Job<EmailJobPayload>)

  assert.equal(called, "template")
})

test("EmailProcessor routes raw jobs to send", async () => {
  let called = ""
  const service = {
    async sendTemplate() {
      called = "template"
      return { accepted: 1 }
    },
    async send() {
      called = "send"
      return { accepted: 1 }
    },
  } as unknown as EmailService

  const processor = new EmailProcessor(service)
  await processor.process({
    data: {
      tenantId: "11111111-1111-4111-8111-111111111111",
      to: ["user@example.com"],
      subject: "Subject",
      html: "<p>Hello</p>",
    },
  } as unknown as Job<EmailJobPayload>)

  assert.equal(called, "send")
})
