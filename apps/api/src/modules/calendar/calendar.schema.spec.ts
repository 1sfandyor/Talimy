/// <reference types="node" />
import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/event.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("event schema defines create/update/query validators", () => {
  assert.match(schemaSource, /export const createEventSchema = z/)
  assert.match(schemaSource, /export const updateEventSchema = z/)
  assert.match(schemaSource, /export const eventsQuerySchema = z/)
})

test("event schema validates date ordering", () => {
  assert.match(schemaSource, /endDate must be greater than or equal to startDate/)
  assert.match(schemaSource, /dateTo must be greater than or equal to dateFrom/)
})
