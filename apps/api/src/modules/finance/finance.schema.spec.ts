import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const repoRoot = join(import.meta.dir, "..", "..", "..", "..", "..")
const schemaFilePath = join(repoRoot, "packages/shared/src/validators/finance.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("finance schema defines fee structure payment and invoice validators", () => {
  assert.match(schemaSource, /export const createFeeStructureSchema = z\.object/)
  assert.match(schemaSource, /export const createPaymentPlanSchema = z\.object/)
  assert.match(schemaSource, /export const createPaymentSchema = z\.object/)
  assert.match(schemaSource, /export const createInvoiceSchema = z/)
})

test("finance schema validates invoice dueDate ordering", () => {
  assert.match(schemaSource, /dueDate must be greater than or equal to issuedDate/)
})
