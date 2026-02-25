/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ScheduleController } from "./schedule.controller"
import type { ScheduleService } from "./schedule.service"
import type { CreateScheduleDto, UpdateScheduleDto } from "./dto/create-schedule.dto"
import type { ScheduleQueryDto } from "./dto/schedule-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("ScheduleController.list delegates validated query to service", () => {
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "asc",
    dayOfWeek: "monday",
  } as unknown as ScheduleQueryDto

  let captured: ScheduleQueryDto | undefined
  const service = {
    list: (q: ScheduleQueryDto) => {
      captured = q
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
  } as unknown as ScheduleService

  const controller = new ScheduleController(service)
  const result = controller.list(query)

  assert.equal(captured, query)
  assert.deepEqual(result, { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } })
})

test("ScheduleController CRUD methods use tenantId from query and delegate payloads", () => {
  const createPayload = { tenantId } as CreateScheduleDto
  const updatePayload = { room: "101-A" } as UpdateScheduleDto
  const calls: Array<{ fn: string; args: unknown[] }> = []

  const service = {
    create: (...args: unknown[]) => {
      calls.push({ fn: "create", args })
      return { id: "schedule-id" }
    },
    update: (...args: unknown[]) => {
      calls.push({ fn: "update", args })
      return { id: "schedule-id" }
    },
    delete: (...args: unknown[]) => {
      calls.push({ fn: "delete", args })
      return { success: true }
    },
    getById: (...args: unknown[]) => {
      calls.push({ fn: "getById", args })
      return { id: "schedule-id" }
    },
  } as unknown as ScheduleService

  const controller = new ScheduleController(service)
  controller.create(createPayload)
  controller.update("schedule-id", { tenantId }, updatePayload)
  controller.delete("schedule-id", { tenantId })
  controller.getById("schedule-id", { tenantId })

  assert.deepEqual(
    calls.map((c) => c.fn),
    ["create", "update", "delete", "getById"]
  )
  assert.deepEqual(calls[1]?.args, [tenantId, "schedule-id", updatePayload])
  assert.deepEqual(calls[2]?.args, [tenantId, "schedule-id"])
  assert.deepEqual(calls[3]?.args, [tenantId, "schedule-id"])
})
