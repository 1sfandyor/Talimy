import { randomUUID } from "node:crypto"

import { Injectable, NotFoundException } from "@nestjs/common"

import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"

type UserRecord = {
  id: string
  tenantId: string
  fullName: string
  email: string
  role: string
}

@Injectable()
export class UsersService {
  private readonly users: UserRecord[] = []

  list(tenantId: string): UserRecord[] {
    return this.users.filter((user) => user.tenantId === tenantId)
  }

  getById(tenantId: string, id: string): UserRecord {
    const found = this.users.find((user) => user.tenantId === tenantId && user.id === id)
    if (!found) {
      throw new NotFoundException("User not found")
    }
    return found
  }

  create(payload: CreateUserDto): UserRecord {
    const next: UserRecord = {
      id: randomUUID(),
      tenantId: payload.tenantId,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role ?? "teacher",
    }
    this.users.push(next)
    return next
  }

  update(tenantId: string, id: string, payload: UpdateUserDto): UserRecord {
    const found = this.getById(tenantId, id)
    if (payload.fullName) {
      found.fullName = payload.fullName
    }
    if (payload.role) {
      found.role = payload.role
    }
    return found
  }

  delete(tenantId: string, id: string): { success: true } {
    const idx = this.users.findIndex((user) => user.tenantId === tenantId && user.id === id)
    if (idx < 0) {
      throw new NotFoundException("User not found")
    }
    this.users.splice(idx, 1)
    return { success: true }
  }
}
