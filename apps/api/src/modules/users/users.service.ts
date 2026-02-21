import { Injectable } from "@nestjs/common"

import { CreateUserDto } from "./dto/create-user.dto"
import { ListUsersQueryDto } from "./dto/list-users-query.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersRepository } from "./users.repository"

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  list(query: ListUsersQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, id: string) {
    return this.repository.getById(tenantId, id)
  }

  create(payload: CreateUserDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, id: string, payload: UpdateUserDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }
}
