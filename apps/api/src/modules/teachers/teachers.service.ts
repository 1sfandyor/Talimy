import { Injectable } from "@nestjs/common"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { ListTeachersQueryDto } from "./dto/list-teachers-query.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"
import { TeachersRepository } from "./teachers.repository"

@Injectable()
export class TeachersService {
  constructor(private readonly repository: TeachersRepository) {}

  list(query: ListTeachersQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateTeacherDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateTeacherDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  getSchedule(tenantId: string, id: string) {
    return this.repository.getSchedule(tenantId, id)
  }

  getClasses(tenantId: string, id: string) {
    return this.repository.getClasses(tenantId, id)
  }

  getSubjects(tenantId: string, id: string) {
    return this.repository.getSubjects(tenantId, id)
  }
}
