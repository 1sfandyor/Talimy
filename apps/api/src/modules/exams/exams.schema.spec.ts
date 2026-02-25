import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/exam.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("exam schema defines create update query and results validators", () => {
  assert.match(schemaSource, /export const examQuerySchema = z/)
  assert.match(schemaSource, /export const createExamSchema = z\.object/)
  assert.match(schemaSource, /export const updateExamSchema = z/)
  assert.match(schemaSource, /export const enterExamResultsSchema = z\.object/)
})

test("exam query schema validates date range and strict date format", () => {
  assert.match(schemaSource, /dateFrom: z\.string\(\)\.date\(\)\.optional\(\)/)
  assert.match(schemaSource, /dateTo: z\.string\(\)\.date\(\)\.optional\(\)/)
  assert.match(schemaSource, /dateFrom cannot be after dateTo/)
})
