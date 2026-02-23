import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/schedule.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("schedule schema defines create update and query validators", () => {
  assert.match(schemaSource, /export const createScheduleSchema = z/)
  assert.match(schemaSource, /export const updateScheduleSchema = z/)
  assert.match(schemaSource, /export const scheduleQuerySchema = z\.object/)
})

test("schedule schema enforces start and end time ordering", () => {
  assert.match(schemaSource, /toSeconds\(value\.startTime\) >= toSeconds\(value\.endTime\)/)
  assert.match(schemaSource, /endTime must be later than startTime/)
})

test("schedule query schema includes class teacher and day filters", () => {
  assert.match(schemaSource, /classId: z\.string\(\)\.uuid\(\)\.optional\(\)/)
  assert.match(schemaSource, /teacherId: z\.string\(\)\.uuid\(\)\.optional\(\)/)
  assert.match(schemaSource, /dayOfWeek: dayOfWeekSchema\.optional\(\)/)
})
