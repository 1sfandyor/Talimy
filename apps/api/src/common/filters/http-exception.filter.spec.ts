/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BadRequestException, NotFoundException } from "@nestjs/common"

import { HttpExceptionFilter } from "./http-exception.filter"

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

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as never

  return {
    host,
    get result() {
      return { statusCode, jsonBody }
    },
  }
}

test("HttpExceptionFilter preserves structured zod-style payload", () => {
  const filter = new HttpExceptionFilter()
  const ctx = createHost()

  const exception = new BadRequestException({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: [{ field: "id", message: "Invalid UUID format" }],
  })

  filter.catch(exception, ctx.host)

  assert.equal(ctx.result.statusCode, 400)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ field: "id", message: "Invalid UUID format" }],
    },
  })
})

test("HttpExceptionFilter normalizes array messages into validation error contract", () => {
  const filter = new HttpExceptionFilter()
  const ctx = createHost()

  const exception = new BadRequestException(["email must be an email", "password too short"])
  filter.catch(exception, ctx.host)

  assert.equal(ctx.result.statusCode, 400)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ message: "email must be an email" }, { message: "password too short" }],
    },
  })
})

test("HttpExceptionFilter applies default code by status", () => {
  const filter = new HttpExceptionFilter()
  const ctx = createHost()

  filter.catch(new NotFoundException("Exam not found"), ctx.host)

  assert.equal(ctx.result.statusCode, 404)
  assert.deepEqual(ctx.result.jsonBody, {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Exam not found",
    },
  })
})
