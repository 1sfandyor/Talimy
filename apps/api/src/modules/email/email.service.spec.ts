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
  const previousFetch = globalThis.fetch
  process.env.RESEND_API_KEY = "test-key"
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: "resend-msg-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch

  try {
    const service = createService()
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
    globalThis.fetch = previousFetch
  }
})

test("EmailService.sendTemplate delegates to render + send", async () => {
  const previousKey = process.env.RESEND_API_KEY
  const previousFetch = globalThis.fetch
  process.env.RESEND_API_KEY = "test-key"
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { id: "resend-msg-2" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch

  try {
    const service = createService()
    const result = await service.sendTemplate({
      tenantId,
      to: ["user@example.com"],
      template: "notification",
      variables: { title: "T", message: "M" },
    })
    assert.equal(result.accepted, 1)
  } finally {
    process.env.RESEND_API_KEY = previousKey
    globalThis.fetch = previousFetch
  }
})
