/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { AiController } from "./ai.controller"
import type { AiService } from "./ai.service"
import type { AiChatDto } from "./dto/chat.dto"
import type { AiInsightsQueryDto, AiReportGenerateDto } from "./dto/report.dto"

const tenantId = "11111111-1111-4111-8111-111111111111"
const actor = { id: "user-id", tenantId, roles: ["school_admin"] } as const

test("AiController delegates chat, insights, report to service", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = []
  const service = {
    chat: (...args: unknown[]) => {
      calls.push({ fn: "chat", args })
      return { response: "ok" }
    },
    getStudentInsights: (...args: unknown[]) => {
      calls.push({ fn: "insights", args })
      return { items: [] }
    },
    generateReport: (...args: unknown[]) => {
      calls.push({ fn: "report", args })
      return { id: "report-id" }
    },
    streamChat: async (...args: unknown[]) => {
      calls.push({ fn: "stream", args })
    },
  } as unknown as AiService

  const controller = new AiController(service)
  controller.chat(
    actor as never,
    { tenantId, messages: [{ role: "user", content: "hi" }] } as AiChatDto
  )
  controller.getStudentInsights(actor as never, "22222222-2222-4222-8222-222222222222", {
    tenantId,
  } as AiInsightsQueryDto)
  controller.generateReport(
    actor as never,
    { tenantId, type: "school_summary" } as AiReportGenerateDto
  )
  await controller.chatStream(
    actor as never,
    { tenantId, messages: [{ role: "user", content: "hi" }] } as AiChatDto,
    {} as never
  )

  assert.deepEqual(
    calls.map((item) => item.fn),
    ["chat", "insights", "report", "stream"]
  )
})
