import { randomUUID } from "node:crypto"

import { Injectable, NotFoundException } from "@nestjs/common"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"

type TeacherRecord = {
  id: string
  tenantId: string
  fullName: string
  employeeId: string
  gender: "male" | "female"
}

@Injectable()
export class TeachersService {
  private readonly teachers: TeacherRecord[] = []

  list(tenantId: string): TeacherRecord[] {
    return this.teachers.filter((teacher) => teacher.tenantId === tenantId)
  }

  getById(tenantId: string, id: string): TeacherRecord {
    const found = this.teachers.find(
      (teacher) => teacher.tenantId === tenantId && teacher.id === id
    )
    if (!found) {
      throw new NotFoundException("Teacher not found")
    }
    return found
  }

  create(payload: CreateTeacherDto): TeacherRecord {
    const next: TeacherRecord = {
      id: randomUUID(),
      tenantId: payload.tenantId,
      fullName: payload.fullName,
      employeeId: payload.employeeId,
      gender: payload.gender,
    }
    this.teachers.push(next)
    return next
  }

  update(tenantId: string, id: string, payload: UpdateTeacherDto): TeacherRecord {
    const found = this.getById(tenantId, id)
    if (payload.fullName) {
      found.fullName = payload.fullName
    }
    if (payload.gender) {
      found.gender = payload.gender
    }
    return found
  }

  delete(tenantId: string, id: string): { success: true } {
    const idx = this.teachers.findIndex(
      (teacher) => teacher.tenantId === tenantId && teacher.id === id
    )
    if (idx < 0) {
      throw new NotFoundException("Teacher not found")
    }
    this.teachers.splice(idx, 1)
    return { success: true }
  }
}
