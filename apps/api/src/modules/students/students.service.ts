import { Injectable } from "@nestjs/common"

import { CreateStudentDto } from "./dto/create-student.dto"
import { ListStudentsQueryDto } from "./dto/list-students-query.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"
import { StudentsRepository } from "./students.repository"
import { StudentsSummaryRepository } from "./students.summary.repository"

@Injectable()
export class StudentsService {
  constructor(
    private readonly repository: StudentsRepository,
    private readonly summaryRepository: StudentsSummaryRepository
  ) {}

  list(query: ListStudentsQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateStudentDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateStudentDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  getGrades(tenantId: string, id: string) {
    return this.repository.getGrades(tenantId, id)
  }

  getAttendance(tenantId: string, id: string) {
    return this.repository.getAttendance(tenantId, id)
  }

  getParents(tenantId: string, id: string) {
    return this.repository.getParents(tenantId, id)
  }

  getSummary(tenantId: string, id: string) {
    return this.summaryRepository.getSummary(tenantId, id)
  }
}
