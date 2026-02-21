import { Injectable } from "@nestjs/common"

import { CreateParentDto } from "./dto/create-parent.dto"
import { ListParentsQueryDto } from "./dto/list-parents-query.dto"
import { UpdateParentDto } from "./dto/update-parent.dto"
import { ParentsRepository } from "./parents.repository"

@Injectable()
export class ParentsService {
  constructor(private readonly repository: ParentsRepository) {}

  list(query: ListParentsQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateParentDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateParentDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  linkStudent(tenantId: string, id: string, studentId: string) {
    return this.repository.linkStudent(tenantId, id, studentId)
  }

  unlinkStudent(tenantId: string, id: string, studentId: string) {
    return this.repository.unlinkStudent(tenantId, id, studentId)
  }

  getChildren(tenantId: string, id: string) {
    return this.repository.getChildren(tenantId, id)
  }
}
