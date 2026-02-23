/// <reference types="node" />
import { strict as assert } from "assert"
import { readFileSync } from "fs"
import { join } from "path"
import { test } from "node:test"

const serviceFilePath = join(process.cwd(), "apps/api/src/modules/finance/finance.service.ts")
const controllerFilePath = join(process.cwd(), "apps/api/src/modules/finance/finance.controller.ts")
const repositoryFilePath = join(process.cwd(), "apps/api/src/modules/finance/finance.repository.ts")
const serviceSource = readFileSync(serviceFilePath, "utf-8")
const controllerSource = readFileSync(controllerFilePath, "utf-8")
const repositorySource = readFileSync(repositoryFilePath, "utf-8")

test("finance service exposes fee structure payment plan payment and invoice operations", () => {
  assert.match(serviceSource, /listFeeStructures\(/)
  assert.match(serviceSource, /createFeeStructure\(/)
  assert.match(serviceSource, /createPaymentPlan\(/)
  assert.match(serviceSource, /createPayment\(/)
  assert.match(serviceSource, /createInvoice\(/)
})

test("finance repository applies tenant filters to finance entities", () => {
  assert.match(repositorySource, /eq\(feeStructures\.tenantId, tenantId\)/)
  assert.match(repositorySource, /eq\(paymentPlans\.tenantId, tenantId\)/)
  assert.match(repositorySource, /eq\(payments\.tenantId, tenantId\)/)
  assert.match(repositorySource, /eq\(invoices\.tenantId, tenantId\)/)
})

test("finance controller wires finance CRUD routes and validators", () => {
  assert.match(controllerSource, /@Get\("fee-structures"\)/)
  assert.match(controllerSource, /@Post\("fee-structures"\)/)
  assert.match(controllerSource, /@Get\("payment-plans"\)/)
  assert.match(controllerSource, /@Post\("payment-plans"\)/)
  assert.match(controllerSource, /@Post\("payments"\)/)
  assert.match(controllerSource, /@Post\("invoices"\)/)
  assert.match(controllerSource, /createFeeStructureSchema/)
  assert.match(controllerSource, /createPaymentPlanSchema/)
  assert.match(controllerSource, /createPaymentSchema/)
  assert.match(controllerSource, /createInvoiceSchema/)
})
