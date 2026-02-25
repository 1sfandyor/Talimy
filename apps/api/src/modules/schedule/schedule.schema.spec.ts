/// <reference types="node" />
import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/schedule.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("schedule schema defines create/update/query validators", () => {
  assert.match(schemaSource, /export const createScheduleSchema = z/)
  assert.match(schemaSource, /export const updateScheduleSchema = z/)
  assert.match(schemaSource, /export const scheduleQuerySchema = z\.object/)
})

test("schedule schema validates time format and time range", () => {
  assert.match(schemaSource, /Invalid time format\. Use HH:mm or HH:mm:ss/)
  assert.match(schemaSource, /endTime must be later than startTime/)
})
