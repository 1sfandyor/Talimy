/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BadRequestException } from "@nestjs/common"
import { uuidStringSchema } from "@talimy/shared"

import { ZodParamFieldPipe } from "./zod-param-field.pipe"

test("ZodParamFieldPipe returns parsed value for valid param", () => {
  const pipe = new ZodParamFieldPipe(uuidStringSchema)
  const value = "11111111-1111-1111-1111-111111111111"

  const result = pipe.transform(value)
  assert.equal(result, value)
})

test("ZodParamFieldPipe throws standardized validation response for invalid param", () => {
  const pipe = new ZodParamFieldPipe(uuidStringSchema)

  assert.throws(
    () => pipe.transform("bad-id"),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException)
      assert.deepEqual(error.getResponse(), {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [{ field: "", message: "Invalid UUID format" }],
      })
      return true
    }
  )
})
