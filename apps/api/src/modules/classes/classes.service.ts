import { Injectable } from "@nestjs/common"

import { ClassesRepository } from "./classes.repository"
import { CreateClassDto } from "./dto/create-class.dto"
import { ListClassesQueryDto } from "./dto/list-classes-query.dto"
import { UpdateClassDto } from "./dto/update-class.dto"

@Injectable()
export class ClassesService {
  constructor(private readonly repository: ClassesRepository) {}

  list(query: ListClassesQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateClassDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateClassDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  getStudents(tenantId: string, id: string) {
    return this.repository.getStudents(tenantId, id)
  }

  getTeachers(tenantId: string, id: string) {
    return this.repository.getTeachers(tenantId, id)
  }

  getSchedule(tenantId: string, id: string) {
    return this.repository.getSchedule(tenantId, id)
  }

  getStats(tenantId: string, id: string) {
    return this.repository.getStats(tenantId, id)
  }
}
