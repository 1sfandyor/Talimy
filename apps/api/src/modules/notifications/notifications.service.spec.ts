/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ForbiddenException } from "@nestjs/common"

import { NotificationsService } from "./notifications.service"
import type { EmailService } from "../email/email.service"
import type { SmsService } from "../sms/sms.service"
import type { NotificationsGateway } from "./notifications.gateway"
import type { NotificationChannel } from "./dto/send-notification.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

function createService() {
  const gateway = {} as NotificationsGateway
  const emailService = {
    sendNotificationEmails: async () => 0,
  } as unknown as EmailService
  const smsService = {
    sendNotificationSms: async () => 0,
  } as unknown as SmsService
  return new NotificationsService(gateway, emailService, smsService)
}

test("NotificationsService resolves channels with default and de-duplication", () => {
  const service = createService() as unknown as {
    resolveChannels: (channels?: NotificationChannel[]) => NotificationChannel[]
  }

  assert.deepEqual(service.resolveChannels(), ["in_app"])
  assert.deepEqual(service.resolveChannels(["email", "sms", "email"]), ["email", "sms"])
})

test("NotificationsService scope rejects cross-tenant and cross-user access for non-platform actors", () => {
  const service = createService() as unknown as {
    assertScope: (
      actor: { id: string; tenantId?: string; roles?: string[] },
      input: { tenantId: string; userId?: string }
    ) => unknown
  }

  assert.throws(
    () =>
      service.assertScope(
        { id: "u1", tenantId, roles: ["teacher"] },
        { tenantId: "99999999-9999-9999-9999-999999999999" }
      ),
    ForbiddenException
  )

  assert.throws(
    () =>
      service.assertScope({ id: "u1", tenantId, roles: ["teacher"] }, { tenantId, userId: "u2" }),
    ForbiddenException
  )
})

test("NotificationsService allows platform admin to target another user", () => {
  const service = createService() as unknown as {
    assertScope: (
      actor: { id: string; tenantId?: string; roles?: string[] },
      input: { tenantId: string; userId?: string }
    ) => { tenantId: string; targetUserId: string }
  }

  const result = service.assertScope(
    { id: "platform-user", roles: ["platform_admin"] },
    { tenantId, userId: "student-user" }
  )

  assert.deepEqual(result, { tenantId, targetUserId: "student-user" })
})
