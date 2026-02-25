import { strict as assert } from "node:assert"
import test from "node:test"

import { ExamsService } from "./exams.service"
import type { CreateExamDto, UpdateExamDto } from "./dto/create-exam.dto"
import type { EnterExamResultsDto } from "./dto/exam-result.dto"
import type { ExamQueryDto } from "./dto/exam-query.dto"
import type { ExamsRepository } from "./exams.repository"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("ExamsService.list delegates to repository", () => {
  const query = { tenantId, page: 1, limit: 20, order: "desc" } as unknown as ExamQueryDto
  let captured: ExamQueryDto | undefined
  const repository = {
    list: (q: ExamQueryDto) => {
      captured = q
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }
    },
  } as unknown as ExamsRepository
  const service = new ExamsService(repository)
  service.list(query)
  assert.equal(captured, query)
})

test("ExamsService CRUD methods delegate to repository with tenant-safe arguments", () => {
  const calls: string[] = []
  const repository = {
    create: (_payload: CreateExamDto) => {
      calls.push("create")
      return { id: "created-exam-id" }
    },
    update: (_tenantId: string, _id: string, _payload: UpdateExamDto) => {
      calls.push("update")
      return { id: "updated-exam-id" }
    },
    delete: (_tenantId: string, _id: string) => {
      calls.push("delete")
      return { success: true }
    },
  } as unknown as ExamsRepository

  const service = new ExamsService(repository)
  service.create({ tenantId } as CreateExamDto)
  service.update(tenantId, "exam-id", { name: "Updated" } as UpdateExamDto)
  service.delete(tenantId, "exam-id")

  assert.deepEqual(calls, ["create", "update", "delete"])
})

test("ExamsService.enterResults and result queries delegate to repository", () => {
  const query = { tenantId, page: 1, limit: 10, order: "desc" } as unknown as ExamQueryDto
  const payload = {
    records: [{ studentId: "22222222-2222-2222-2222-222222222222", score: 75 }],
  } as unknown as EnterExamResultsDto

  const captured: Array<{ fn: string; args: unknown[] }> = []
  const repository = {
    enterResults: (...args: unknown[]) => {
      captured.push({ fn: "enterResults", args })
      return { success: true, affected: 1 }
    },
    getResultsByExam: (...args: unknown[]) => {
      captured.push({ fn: "getResultsByExam", args })
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
    getResultsByStudent: (...args: unknown[]) => {
      captured.push({ fn: "getResultsByStudent", args })
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
    getStats: (...args: unknown[]) => {
      captured.push({ fn: "getStats", args })
      return { totals: { resultsCount: 0 } }
    },
  } as unknown as ExamsRepository

  const service = new ExamsService(repository)
  service.enterResults(tenantId, "exam-id", payload)
  service.getResultsByExam(tenantId, "exam-id", query)
  service.getResultsByStudent(tenantId, "student-id", query)
  service.getStats(tenantId, "exam-id")

  assert.deepEqual(
    captured.map((c) => c.fn),
    ["enterResults", "getResultsByExam", "getResultsByStudent", "getStats"]
  )
  assert.equal(captured[0]?.args[0], tenantId)
  assert.equal(captured[0]?.args[1], "exam-id")
})
