import { strict as assert } from "node:assert"
import test from "node:test"

import { AssignmentsService } from "./assignments.service"
import type { AssignmentSubmissionFilesService } from "./assignment-submission-files.service"
import type { SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import type { AssignmentsRepository } from "./assignments.repository"

test("AssignmentsService.submit delegates to repository", async () => {
  const tenantId = "11111111-1111-1111-1111-111111111111"
  const payload: SubmitAssignmentDto = {
    studentId: "22222222-2222-2222-2222-222222222222",
    fileUrl: "https://files.talimy.space/submissions/demo.pdf",
  }

  let captured:
    | {
        tenantId: string
        assignmentId: string
        payload: SubmitAssignmentDto
      }
    | undefined

  const repository = {
    submit: (tenantId: string, assignmentId: string, data: SubmitAssignmentDto) => {
      captured = { tenantId, assignmentId, payload: data }
      return { success: true, data: { id: "submission-id" } }
    },
  } as unknown as AssignmentsRepository

  const fileService = {
    saveSubmissionFile: async () => "https://files.talimy.space/submissions/generated.pdf",
  } as unknown as AssignmentSubmissionFilesService

  const service = new AssignmentsService(repository, fileService)
  const result = service.submit(tenantId, "assignment-id", payload)

  assert.deepEqual(captured, {
    tenantId,
    assignmentId: "assignment-id",
    payload,
  })
  assert.deepEqual(result, { success: true, data: { id: "submission-id" } })
})

test("AssignmentsService.submitWithUploadedFile stores file and delegates to repository with generated fileUrl", async () => {
  const tenantId = "11111111-1111-1111-1111-111111111111"
  const payload: SubmitAssignmentDto = {
    studentId: "22222222-2222-2222-2222-222222222222",
  }
  const uploadedFile = {
    originalname: "homework.pdf",
    buffer: Buffer.from("demo"),
  }

  let savedInput:
    | {
        tenantId: string
        assignmentId: string
        studentId: string
        file: { buffer: Buffer; originalname?: string }
      }
    | undefined
  let repoPayload: SubmitAssignmentDto | undefined

  const repository = {
    submit: (_tenantId: string, _assignmentId: string, data: SubmitAssignmentDto) => {
      repoPayload = data
      return { success: true, data: { id: "submission-id" } }
    },
  } as unknown as AssignmentsRepository

  const fileService = {
    saveSubmissionFile: async (input: {
      tenantId: string
      assignmentId: string
      studentId: string
      file: { buffer: Buffer; originalname?: string }
    }) => {
      savedInput = input
      return "https://files.talimy.space/submissions/generated.pdf"
    },
  } as unknown as AssignmentSubmissionFilesService

  const service = new AssignmentsService(repository, fileService)
  const result = await service.submitWithUploadedFile(tenantId, "assignment-id", payload, uploadedFile)

  assert.deepEqual(savedInput, {
    tenantId,
    assignmentId: "assignment-id",
    studentId: payload.studentId,
    file: uploadedFile,
  })
  assert.deepEqual(repoPayload, {
    ...payload,
    fileUrl: "https://files.talimy.space/submissions/generated.pdf",
  })
  assert.deepEqual(result, { success: true, data: { id: "submission-id" } })
})
