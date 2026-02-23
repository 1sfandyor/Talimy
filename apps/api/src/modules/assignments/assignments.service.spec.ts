import { strict as assert } from "node:assert"
import test from "node:test"

import { AssignmentsService } from "./assignments.service"
import type { SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import type { AssignmentsRepository } from "./assignments.repository"

test("AssignmentsService.submit delegates to repository", async () => {
  const payload: SubmitAssignmentDto = {
    tenantId: "11111111-1111-1111-1111-111111111111",
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

  const service = new AssignmentsService(repository)
  const result = service.submit(payload.tenantId, "assignment-id", payload)

  assert.deepEqual(captured, {
    tenantId: payload.tenantId,
    assignmentId: "assignment-id",
    payload,
  })
  assert.deepEqual(result, { success: true, data: { id: "submission-id" } })
})
