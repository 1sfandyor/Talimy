import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/assignment.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("assignment schema defines create/update/query/submit/grade validators", () => {
  assert.match(schemaSource, /export const assignmentQuerySchema = z/)
  assert.match(schemaSource, /export const createAssignmentSchema = z\.object/)
  assert.match(schemaSource, /export const updateAssignmentSchema = z/)
  assert.match(schemaSource, /export const submitAssignmentSchema = z\.object/)
  assert.match(schemaSource, /export const gradeAssignmentSubmissionSchema = z\.object/)
})

test("assignment query schema validates strict dueDate filters and ordering", () => {
  assert.match(schemaSource, /dueDateFrom: z\.string\(\)\.date\(\)\.optional\(\)/)
  assert.match(schemaSource, /dueDateTo: z\.string\(\)\.date\(\)\.optional\(\)/)
  assert.match(schemaSource, /dueDateFrom cannot be after dueDateTo/)
})
