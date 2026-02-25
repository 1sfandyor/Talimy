/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { UploadService } from "./upload.service"

test("UploadService builds tenant-scoped keys", () => {
  const service = new UploadService()
  const key = (service as any).buildObjectKey(
    "11111111-1111-1111-1111-111111111111",
    "assignments/submissions",
    "My File.pdf"
  ) as string

  assert.match(key, /^uploads\/11111111-1111-1111-1111-111111111111\/assignments\/submissions\//)
  assert.match(key, /-My-File\.pdf$/)
})

test("UploadService rejects delete outside tenant prefix", () => {
  const service = new UploadService()
  assert.throws(
    () =>
      (service as any).assertKeyInTenant(
        "11111111-1111-1111-1111-111111111111",
        "uploads/other/key.txt"
      ),
    /tenant upload scope/
  )
})

test("UploadService validates mime allowlist", () => {
  const service = new UploadService()
  assert.doesNotThrow(() => (service as any).assertMimeAllowed("application/pdf"))
  assert.throws(
    () => (service as any).assertMimeAllowed("application/x-msdownload"),
    /Unsupported file type/
  )
})
