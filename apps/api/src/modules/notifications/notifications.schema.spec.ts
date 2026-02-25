/// <reference types="node" />
import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/notification.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("notification schema defines send/list/scope/read validators", () => {
  assert.match(schemaSource, /export const sendNotificationSchema = z\.object/)
  assert.match(schemaSource, /export const notificationsQuerySchema = z\.object/)
  assert.match(schemaSource, /export const notificationScopeQuerySchema = z\.object/)
  assert.match(schemaSource, /export const markNotificationReadSchema = z\.object/)
})

test("notification schema defines type and channel enums", () => {
  assert.match(
    schemaSource,
    /notificationTypeSchema = z\.enum\(\["info", "success", "warning", "error"\]\)/
  )
  assert.match(schemaSource, /notificationChannelSchema = z\.enum\(\["in_app", "email", "sms"\]\)/)
})
