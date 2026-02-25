/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { CalendarService } from "./calendar.service"
import type { CalendarRepository } from "./calendar.repository"
import type { CreateEventDto, UpdateEventDto } from "./dto/create-event.dto"
import type { EventQueryDto } from "./dto/event-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("CalendarService delegates list/get/create/update/delete to repository", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = []
  const repository = {
    list: (...args: unknown[]) => {
      calls.push({ fn: "list", args })
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
    getById: (...args: unknown[]) => {
      calls.push({ fn: "getById", args })
      return { id: "event-id" }
    },
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
  } as unknown as CalendarRepository

  const service = new CalendarService(repository)
  await service.list({ tenantId, page: 1, limit: 10, order: "asc" } as unknown as EventQueryDto)
  await service.getById(tenantId, "event-id")
  await service.create({ tenantId, title: "A" } as CreateEventDto)
  await service.update(tenantId, "event-id", { title: "B" } as UpdateEventDto)
  await service.delete(tenantId, "event-id")

  assert.deepEqual(
    calls.map((c) => c.fn),
    ["list", "getById", "create", "update", "delete"]
  )
})
