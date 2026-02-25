/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ServiceUnavailableException } from "@nestjs/common"

import { AiOpenRouterClient } from "./ai.openrouter.client"
import { AiService } from "./ai.service"

const tenantId = "11111111-1111-4111-8111-111111111111"

test("AiService.chat throws 503 when OPENROUTER_API_KEY is missing", async () => {
  const previous = process.env.OPENROUTER_API_KEY
  delete process.env.OPENROUTER_API_KEY

  try {
    const service = new AiService(new AiOpenRouterClient(), {} as never)
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
    if (previous) process.env.OPENROUTER_API_KEY = previous
  }
})
