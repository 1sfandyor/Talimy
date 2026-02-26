/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ServiceUnavailableException } from "@nestjs/common"

import { EmailService } from "./email.service"
import type { EmailTemplatesService } from "./email.templates"

const tenantId = "11111111-1111-4111-8111-111111111111"

function createService() {
  const templates = {
    render: () => ({
      subject: "Rendered Subject",
      html: "<p>Rendered</p>",
      text: "Rendered",
    }),
  } as unknown as EmailTemplatesService
  return new EmailService(templates)
}

function stubResendClientSend(
  service: EmailService,
  implementation: () => Promise<{
    data: { id?: string } | null
    error: { message: string } | null
  }>
) {
  ;(
    service as unknown as { getClient: () => { emails: { send: typeof implementation } } }
  ).getClient = () => ({
    emails: {
      send: implementation,
    },
  })
}

test("EmailService.send throws when RESEND_API_KEY is missing", async () => {
  const previous = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  const service = createService()
  await assert.rejects(
    service.send({
      tenantId,
      to: ["user@example.com"],
      subject: "Hello",
      html: "<p>Hello</p>",
    }),
    ServiceUnavailableException
  )
  process.env.RESEND_API_KEY = previous
})

test("EmailService.send maps Resend success response", async () => {
  const previousKey = process.env.RESEND_API_KEY
  process.env.RESEND_API_KEY = "test-key"

  try {
    const service = createService()
    stubResendClientSend(service, async () => ({
      data: { id: "resend-msg-1" },
      error: null,
    }))
    const result = await service.send({
      tenantId,
      to: ["user@example.com"],
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    })

    assert.equal(result.provider, "resend")
    assert.equal(result.accepted, 1)
    assert.deepEqual(result.messageIds, ["resend-msg-1"])
  } finally {
    process.env.RESEND_API_KEY = previousKey
  }
})

test("EmailService.sendTemplate delegates to render + send", async () => {
  const previousKey = process.env.RESEND_API_KEY
  process.env.RESEND_API_KEY = "test-key"

  try {
    const service = createService()
    stubResendClientSend(service, async () => ({
      data: { id: "resend-msg-2" },
      error: null,
    }))
    const result = await service.sendTemplate({
      tenantId,
      to: ["user@example.com"],
      template: "notification",
      variables: { title: "T", message: "M" },
    })
    assert.equal(result.accepted, 1)
  } finally {
    process.env.RESEND_API_KEY = previousKey
  }
})
