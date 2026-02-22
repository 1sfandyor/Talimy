import { Injectable } from "@nestjs/common"

import { CreateGradeDto, CreateGradeScaleDto, UpdateGradeScaleDto } from "./dto/create-grade.dto"
import { GradeQueryDto } from "./dto/grade-query.dto"
import { GradesRepository } from "./grades.repository"

@Injectable()
export class GradesService {
  constructor(private readonly repository: GradesRepository) {}

  enter(payload: CreateGradeDto) {
    return this.repository.enter(payload)
  }

  list(query: GradeQueryDto) {
    return this.repository.list(query)
  }

  getByStudent(tenantId: string, studentId: string, query: GradeQueryDto) {
    return this.repository.getByStudent(tenantId, studentId, query)
  }

  getByClass(tenantId: string, classId: string, query: GradeQueryDto) {
    return this.repository.getByClass(tenantId, classId, query)
  }

  report(query: GradeQueryDto) {
    return this.repository.report(query)
  }

  listScales(tenantId: string) {
    return this.repository.listScales(tenantId)
  }

  createScale(payload: CreateGradeScaleDto) {
    return this.repository.createScale(payload)
  }

  updateScale(tenantId: string, id: string, payload: UpdateGradeScaleDto) {
    return this.repository.updateScale(tenantId, id, payload)
  }

  deleteScale(tenantId: string, id: string) {
    return this.repository.deleteScale(tenantId, id)
  }
}
