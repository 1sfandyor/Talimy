/// <reference types="node" />
import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const schemaFilePath = join(process.cwd(), "packages/shared/src/validators/upload.schema.ts")
const schemaSource = readFileSync(schemaFilePath, "utf-8")

test("upload schema defines multipart, signed-url and delete validators", () => {
  assert.match(schemaSource, /export const uploadMultipartSchema = z\.object/)
  assert.match(schemaSource, /export const uploadSignedUrlSchema = z\.object/)
  assert.match(schemaSource, /export const uploadDeleteSchema = z\.object/)
})

test("upload schema constrains signed-url expiry bounds", () => {
  assert.match(
    schemaSource,
    /expiresInSeconds: z\.coerce\.number\(\)\.int\(\)\.min\(60\)\.max\(3600\)/
  )
})
