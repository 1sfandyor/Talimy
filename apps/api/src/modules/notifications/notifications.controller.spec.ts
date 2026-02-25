/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { NotificationsController } from "./notifications.controller"
import type { NotificationsService } from "./notifications.service"
import type {
  MarkNotificationReadDto,
  NotificationScopeQueryDto,
  NotificationsQueryDto,
  SendNotificationDto,
} from "./dto/send-notification.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"
const actor = {
  id: "22222222-2222-2222-2222-222222222222",
  tenantId,
  roles: ["school_admin"],
} as const

test("NotificationsController list/unread-count delegate actor and query", () => {
  const listQuery = {
    tenantId,
    page: 1,
    limit: 10,
    order: "desc",
    unreadOnly: "true",
  } as unknown as NotificationsQueryDto
  const scopeQuery = { tenantId } as NotificationScopeQueryDto
  const calls: Array<{ fn: string; args: unknown[] }> = []

  const service = {
    list: (...args: unknown[]) => {
      calls.push({ fn: "list", args })
      return { success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
    getUnreadCount: (...args: unknown[]) => {
      calls.push({ fn: "getUnreadCount", args })
      return { success: true, data: { unreadCount: 0 } }
    },
  } as unknown as NotificationsService

  const controller = new NotificationsController(service)
  controller.list(actor as never, listQuery)
  controller.unreadCount(actor as never, scopeQuery)

  assert.deepEqual(calls[0], { fn: "list", args: [actor, listQuery] })
  assert.deepEqual(calls[1], { fn: "getUnreadCount", args: [actor, scopeQuery] })
})

test("NotificationsController send/markRead delegate validated inputs", () => {
  const sendBody = {
    tenantId,
    recipientUserIds: ["33333333-3333-4333-8333-333333333333"],
    title: "Test",
    message: "Hello",
    channels: ["in_app"],
  } as unknown as SendNotificationDto
  const readBody = { tenantId, read: true } as MarkNotificationReadDto
  const calls: Array<{ fn: string; args: unknown[] }> = []

  const service = {
    send: (...args: unknown[]) => {
      calls.push({ fn: "send", args })
      return { success: true }
    },
    markRead: (...args: unknown[]) => {
      calls.push({ fn: "markRead", args })
      return { success: true }
    },
  } as unknown as NotificationsService

  const controller = new NotificationsController(service)
  controller.send(actor as never, sendBody)
  controller.markRead(actor as never, "44444444-4444-4444-4444-444444444444", readBody)

  assert.deepEqual(calls[0], { fn: "send", args: [actor, sendBody] })
  assert.deepEqual(calls[1], {
    fn: "markRead",
    args: [actor, "44444444-4444-4444-4444-444444444444", readBody],
  })
})
