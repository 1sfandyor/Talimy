/// <reference types="node" />
import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/notice.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("notice schema defines targetRole and priority enums", () => {
  assert.match(
    schemaSource,
    /noticeTargetRoleSchema = z\.enum\(\["all", "teachers", "students", "parents"\]\)/
  )
  assert.match(
    schemaSource,
    /noticePrioritySchema = z\.enum\(\["low", "medium", "high", "urgent"\]\)/
  )
})

test("notice schema defines create update and query validators", () => {
  assert.match(schemaSource, /export const createNoticeSchema = z/)
  assert.match(schemaSource, /export const updateNoticeSchema = z/)
  assert.match(schemaSource, /export const noticesQuerySchema = z\.object/)
})
