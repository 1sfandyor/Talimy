/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { z } from "zod"

import { AllExceptionsFilter } from "./all-exceptions.filter"

function createHost() {
  let statusCode = 0
  let jsonBody: unknown
  const response = {
    status: (code: number) => {
      statusCode = code
      return {
        json: (payload: unknown) => {
          jsonBody = payload
        },
      }
    },
  }

  const request = { method: "GET", url: "/api/test" }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as never

  return {
    host,
    get result() {
      return { statusCode, jsonBody }
    },
  }
}

test("AllExceptionsFilter maps ZodError to validation contract", () => {
  const filter = new AllExceptionsFilter()
  const ctx = createHost()
  const zodError = z.object({ id: z.string().uuid() }).safeParse({ id: "bad" })
  assert.equal(zodError.success, false)

  filter.catch(zodError.error, ctx.host)

  assert.equal(ctx.result.statusCode, 500)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ field: "id", message: "Invalid uuid" }],
    },
  })
})

test("AllExceptionsFilter hides database-like internals behind stable message", () => {
  const filter = new AllExceptionsFilter()
  const ctx = createHost()

  filter.catch(
    { code: "23505", detail: "duplicate key value violates unique constraint" },
    ctx.host
  )

  assert.equal(ctx.result.statusCode, 500)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "DATABASE_ERROR",
      message: "Database operation failed",
    },
  })
})

test("AllExceptionsFilter falls back to UNHANDLED_EXCEPTION for generic errors", () => {
  const filter = new AllExceptionsFilter()
  const ctx = createHost()

  filter.catch(new Error("boom"), ctx.host)

  assert.equal(ctx.result.statusCode, 500)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "UNHANDLED_EXCEPTION",
      message: "boom",
    },
  })
})
