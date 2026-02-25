import { strict as assert } from "node:assert"
import test from "node:test"

import { ExamsController } from "./exams.controller"
import type { ExamsService } from "./exams.service"
import type { CreateExamDto, UpdateExamDto } from "./dto/create-exam.dto"
import type { EnterExamResultsDto } from "./dto/exam-result.dto"
import type { ExamQueryDto } from "./dto/exam-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("ExamsController.list delegates query to service", () => {
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "desc",
  } as unknown as ExamQueryDto

  let captured: ExamQueryDto | undefined
  const service = {
    list: (q: ExamQueryDto) => {
      captured = q
      return { success: true, data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } } }
    },
  } as unknown as ExamsService

  const controller = new ExamsController(service)
  const result = controller.list(query)

  assert.equal(captured, query)
  assert.equal((result as { success?: boolean }).success, true)
})

test("ExamsController.update uses tenantId from query and passes body separately", () => {
  const payload = {
    name: "Updated exam",
  } as unknown as UpdateExamDto

  let captured:
    | {
        tenantId: string
        id: string
        payload: UpdateExamDto
      }
    | undefined

  const service = {
    update: (qTenantId: string, id: string, data: UpdateExamDto) => {
      captured = { tenantId: qTenantId, id, payload: data }
      return { success: true, data: { id } }
    },
  } as unknown as ExamsService

  const controller = new ExamsController(service)
  const result = controller.update("exam-id", tenantId, payload)

  assert.deepEqual(captured, { tenantId, id: "exam-id", payload })
  assert.deepEqual(result, { success: true, data: { id: "exam-id" } })
})

test("ExamsController.enterResults uses tenantId from query and delegates bulk payload", () => {
  const payload = {
    records: [{ studentId: "22222222-2222-2222-2222-222222222222", score: 88, grade: "B+" }],
  } as unknown as EnterExamResultsDto

  let captured:
    | {
        tenantId: string
        examId: string
        payload: EnterExamResultsDto
      }
    | undefined

  const service = {
    enterResults: (qTenantId: string, examId: string, data: EnterExamResultsDto) => {
      captured = { tenantId: qTenantId, examId, payload: data }
      return { success: true, data: { success: true, affected: 1 } }
    },
  } as unknown as ExamsService

  const controller = new ExamsController(service)
  const result = controller.enterResults("exam-id", tenantId, payload)

  assert.deepEqual(captured, { tenantId, examId: "exam-id", payload })
  assert.deepEqual(result, { success: true, data: { success: true, affected: 1 } })
})

test("ExamsController.getResultsByStudent delegates tenant from validated query", () => {
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "desc",
    examId: "33333333-3333-3333-3333-333333333333",
  } as unknown as ExamQueryDto

  let captured:
    | {
        tenantId: string
        studentId: string
        query: ExamQueryDto
      }
    | undefined

  const service = {
    getResultsByStudent: (qTenantId: string, studentId: string, q: ExamQueryDto) => {
      captured = { tenantId: qTenantId, studentId, query: q }
      return { success: true, data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } } }
    },
  } as unknown as ExamsService

  const controller = new ExamsController(service)
  controller.getResultsByStudent("student-id", query)

  assert.deepEqual(captured, { tenantId, studentId: "student-id", query })
})

test("ExamsController.create delegates payload to service", () => {
  const payload = {
    tenantId,
    name: "Exam",
    type: "quiz",
    subjectId: "44444444-4444-4444-4444-444444444444",
    classId: "55555555-5555-5555-5555-555555555555",
    date: "2026-02-25",
    totalMarks: 100,
    duration: 60,
  } as unknown as CreateExamDto

  let captured: CreateExamDto | undefined
  const service = {
    create: (data: CreateExamDto) => {
      captured = data
      return { success: true, data: { id: "exam-id" } }
    },
  } as unknown as ExamsService

  const controller = new ExamsController(service)
  const result = controller.create(payload)

  assert.equal(captured, payload)
  assert.deepEqual(result, { success: true, data: { id: "exam-id" } })
})
