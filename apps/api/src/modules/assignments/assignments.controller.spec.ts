import { strict as assert } from "node:assert"
import test from "node:test"

import { BadRequestException } from "@nestjs/common"

import { AssignmentsController } from "./assignments.controller"
import type { AssignmentsService } from "./assignments.service"
import type { SubmitAssignmentDto } from "./dto/submit-assignment.dto"

const baseSubmitPayload: SubmitAssignmentDto = {
  tenantId: "11111111-1111-1111-1111-111111111111",
  studentId: "22222222-2222-2222-2222-222222222222",
  fileUrl: "https://files.talimy.space/submissions/demo.pdf",
}

test("AssignmentsController.submit requires fileUrl or multipart file", async () => {
  const service = {
    submit: () => ({ success: true }),
  } as unknown as AssignmentsService
  const controller = new AssignmentsController(service)

  assert.throws(
    () =>
      controller.submit(
        "assignment-id",
        baseSubmitPayload.tenantId,
        { ...baseSubmitPayload, fileUrl: undefined },
        undefined
      ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === "Either fileUrl or multipart file is required"
  )
})

test("AssignmentsController.submit enforces explicit /upload handoff for multipart-only submit", async () => {
  const service = {
    submit: () => ({ success: true }),
  } as unknown as AssignmentsService
  const controller = new AssignmentsController(service)

  assert.throws(
    () =>
      controller.submit(
        "assignment-id",
        baseSubmitPayload.tenantId,
        { ...baseSubmitPayload, fileUrl: undefined },
        { originalname: "homework.pdf" }
      ),
    (error: unknown) =>
      error instanceof BadRequestException && error.message.includes("Upload the file via /upload")
  )
})

test("AssignmentsController.submit delegates to service when fileUrl is provided", async () => {
  let captured:
    | {
        tenantId: string
        assignmentId: string
        payload: SubmitAssignmentDto
      }
    | undefined

  const service = {
    submit: (tenantId: string, assignmentId: string, payload: SubmitAssignmentDto) => {
      captured = { tenantId, assignmentId, payload }
      return { success: true, data: { id: "submission-id" } }
    },
  } as unknown as AssignmentsService

  const controller = new AssignmentsController(service)
  const result = controller.submit("assignment-id", baseSubmitPayload.tenantId, baseSubmitPayload, undefined)

  assert.deepEqual(captured, {
    tenantId: baseSubmitPayload.tenantId,
    assignmentId: "assignment-id",
    payload: baseSubmitPayload,
  })
  assert.deepEqual(result, { success: true, data: { id: "submission-id" } })
})
