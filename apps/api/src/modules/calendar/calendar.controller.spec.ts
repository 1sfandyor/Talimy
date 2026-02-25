/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { CalendarController } from "./calendar.controller"
import type { CalendarService } from "./calendar.service"
import type { CreateEventDto, UpdateEventDto } from "./dto/create-event.dto"
import type { EventQueryDto } from "./dto/event-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("CalendarController.list delegates validated query to service", () => {
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "asc",
    type: "exam",
  } as unknown as EventQueryDto

  let captured: EventQueryDto | undefined
  const service = {
    list: (q: EventQueryDto) => {
      captured = q
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
  } as unknown as CalendarService

  const controller = new CalendarController(service)
  const result = controller.list(query)

  assert.equal(captured, query)
  assert.deepEqual(result, { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } })
})

test("CalendarController CRUD methods use tenantId query and id param", () => {
  const calls: Array<{ fn: string; args: unknown[] }> = []
  const createPayload = { tenantId, title: "A" } as CreateEventDto
  const updatePayload = { title: "B" } as UpdateEventDto

  const service = {
    create: (...args: unknown[]) => {
      calls.push({ fn: "create", args })
      return { id: "event-id" }
    },
    update: (...args: unknown[]) => {
      calls.push({ fn: "update", args })
      return { id: "event-id" }
    },
    delete: (...args: unknown[]) => {
      calls.push({ fn: "delete", args })
      return { success: true }
    },
    getById: (...args: unknown[]) => {
      calls.push({ fn: "getById", args })
      return { id: "event-id" }
    },
  } as unknown as CalendarService

  const controller = new CalendarController(service)
  controller.create(createPayload)
  controller.getById("event-id", { tenantId })
  controller.update("event-id", { tenantId }, updatePayload)
  controller.delete("event-id", { tenantId })

  assert.deepEqual(
    calls.map((c) => c.fn),
    ["create", "getById", "update", "delete"]
  )
  assert.deepEqual(calls[1]?.args, [tenantId, "event-id"])
  assert.deepEqual(calls[2]?.args, [tenantId, "event-id", updatePayload])
  assert.deepEqual(calls[3]?.args, [tenantId, "event-id"])
})
