/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { UploadController } from "./upload.controller"
import type { UploadService } from "./upload.service"
import type { UploadDeleteDto, UploadMultipartDto, UploadSignedUrlDto } from "./dto/upload.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("UploadController delegates multipart upload, signed-url and delete", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = []
  const service = {
    uploadFile: async (...args: unknown[]) => {
      calls.push({ fn: "uploadFile", args })
      return { key: "uploads/a.txt" }
    },
    getSignedUrlForUpload: async (...args: unknown[]) => {
      calls.push({ fn: "getSignedUrlForUpload", args })
      return { key: "uploads/a.txt", signedUrl: "https://example.com" }
    },
    deleteFile: async (...args: unknown[]) => {
      calls.push({ fn: "deleteFile", args })
      return { success: true }
    },
  } as unknown as UploadService

  const controller = new UploadController(service)
  const file = {
    buffer: Buffer.from("hello"),
    originalname: "a.txt",
    mimetype: "text/plain",
    size: 5,
  }

  await controller.upload(file, { tenantId, folder: "docs" } as UploadMultipartDto)
  await controller.signedUrl({
    tenantId,
    fileName: "a.txt",
    contentType: "text/plain",
  } as UploadSignedUrlDto)
  await controller.delete({ tenantId }, {
    key: `uploads/${tenantId}/docs/a.txt`,
  } as UploadDeleteDto)

  assert.deepEqual(
    calls.map((c) => c.fn),
    ["uploadFile", "getSignedUrlForUpload", "deleteFile"]
  )
  assert.deepEqual(calls[2]?.args, [tenantId, { key: `uploads/${tenantId}/docs/a.txt` }])
})
