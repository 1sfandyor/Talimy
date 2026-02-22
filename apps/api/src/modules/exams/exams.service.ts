import { Injectable } from "@nestjs/common"

import { CreateExamDto, UpdateExamDto } from "./dto/create-exam.dto"
import { EnterExamResultsDto } from "./dto/exam-result.dto"
import { ExamQueryDto } from "./dto/exam-query.dto"
import { ExamsRepository } from "./exams.repository"

@Injectable()
export class ExamsService {
  constructor(private readonly repository: ExamsRepository) {}

  list(query: ExamQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateExamDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateExamDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  enterResults(tenantId: string, examId: string, payload: EnterExamResultsDto) {
    return this.repository.enterResults(tenantId, examId, payload)
  }

  getResultsByExam(tenantId: string, examId: string, query: ExamQueryDto) {
    return this.repository.getResultsByExam(tenantId, examId, query)
  }

  getResultsByStudent(tenantId: string, studentId: string, query: ExamQueryDto) {
    return this.repository.getResultsByStudent(tenantId, studentId, query)
  }

  getStats(tenantId: string, examId: string) {
    return this.repository.getStats(tenantId, examId)
  }
}
