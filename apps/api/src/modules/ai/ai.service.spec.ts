/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ServiceUnavailableException } from "@nestjs/common"

import { AiService } from "./ai.service"

const tenantId = "11111111-1111-4111-8111-111111111111"

test("AiService.chat throws 503 when ANTHROPIC_API_KEY is missing", async () => {
  const previous = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY

  try {
    const service = new AiService()
    await assert.rejects(
      () =>
        service.chat(
          { id: "user-id", tenantId, roles: ["school_admin"] } as never,
          {
            tenantId,
            messages: [{ role: "user", content: "hello" }],
          } as never
        ),
      (error: unknown) => error instanceof ServiceUnavailableException
    )
  } finally {
    if (previous) process.env.ANTHROPIC_API_KEY = previous
  }
})
