/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { NoticesController } from "./notices.controller"
import type { NoticesService } from "./notices.service"
import type { CreateNoticeDto, UpdateNoticeDto } from "./dto/create-notice.dto"
import type { NoticeQueryDto } from "./dto/notice-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"
const actor = {
  id: "22222222-2222-2222-2222-222222222222",
  tenantId,
  roles: ["school_admin"],
} as const

test("NoticesController.list delegates actor and query to service", () => {
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "desc",
    targetRole: "teachers",
    priority: "high",
  } as unknown as NoticeQueryDto

  let captured: { actor: unknown; query: NoticeQueryDto } | undefined
  const service = {
    list: (user: unknown, q: NoticeQueryDto) => {
      captured = { actor: user, query: q }
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
  } as unknown as NoticesService

  const controller = new NoticesController(service)
  controller.list(actor as never, query)

  assert.deepEqual(captured, { actor, query })
})

test("NoticesController CRUD methods delegate validated inputs", () => {
  const createPayload = {
    tenantId,
    title: "Notice",
    content: "Content",
    targetRole: "all",
    priority: "medium",
  } as unknown as CreateNoticeDto
  const updatePayload = { title: "Updated" } as unknown as UpdateNoticeDto
  const calls: Array<{ fn: string; args: unknown[] }> = []

  const service = {
    create: (...args: unknown[]) => {
      calls.push({ fn: "create", args })
      return { id: "notice-id" }
    },
    update: (...args: unknown[]) => {
      calls.push({ fn: "update", args })
      return { id: "notice-id" }
    },
    delete: (...args: unknown[]) => {
      calls.push({ fn: "delete", args })
      return { success: true }
    },
    getById: (...args: unknown[]) => {
      calls.push({ fn: "getById", args })
      return { id: "notice-id" }
    },
  } as unknown as NoticesService

  const controller = new NoticesController(service)
  controller.create(actor as never, createPayload)
  controller.update("notice-id", { tenantId }, updatePayload)
  controller.delete("notice-id", { tenantId })
  controller.getById(actor as never, "notice-id", { tenantId })

  assert.deepEqual(
    calls.map((c) => c.fn),
    ["create", "update", "delete", "getById"]
  )
  assert.deepEqual(calls[1]?.args, [tenantId, "notice-id", updatePayload])
  assert.deepEqual(calls[2]?.args, [tenantId, "notice-id"])
})
