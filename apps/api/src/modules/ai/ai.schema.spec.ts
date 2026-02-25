/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { aiChatSchema, aiInsightsQuerySchema, aiReportGenerateSchema } from "@talimy/shared"

const tenantId = "11111111-1111-4111-8111-111111111111"

test("aiChatSchema validates chat payload", () => {
  const parsed = aiChatSchema.parse({
    tenantId,
    messages: [{ role: "user", content: "Hello" }],
    maxTokens: 256,
    temperature: 0.2,
  })

  assert.equal(parsed.tenantId, tenantId)
  assert.equal(parsed.messages.length, 1)
})

test("aiInsightsQuerySchema supports optional type and regenerate", () => {
  const parsed = aiInsightsQuerySchema.parse({
    tenantId,
    type: "progress_summary",
    regenerate: "true",
  })
  assert.equal(parsed.tenantId, tenantId)
  assert.equal(parsed.type, "progress_summary")
  assert.equal(parsed.regenerate, true)
})

test("aiReportGenerateSchema validates report type", () => {
  const parsed = aiReportGenerateSchema.parse({
    tenantId,
    type: "school_summary",
    parameters: { period: "monthly" },
  })
  assert.equal(parsed.type, "school_summary")
})
