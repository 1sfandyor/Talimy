import { randomUUID } from "node:crypto"

import { Injectable, NotFoundException } from "@nestjs/common"

import { CreateStudentDto } from "./dto/create-student.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"

type StudentRecord = {
  id: string
  tenantId: string
  fullName: string
  studentCode: string
  gender: "male" | "female"
}

@Injectable()
export class StudentsService {
  private readonly students: StudentRecord[] = []

  list(tenantId: string): StudentRecord[] {
    return this.students.filter((student) => student.tenantId === tenantId)
  }

  getById(tenantId: string, id: string): StudentRecord {
    const found = this.students.find(
      (student) => student.tenantId === tenantId && student.id === id
    )
    if (!found) {
      throw new NotFoundException("Student not found")
    }
    return found
  }

  create(payload: CreateStudentDto): StudentRecord {
    const next: StudentRecord = {
      id: randomUUID(),
      tenantId: payload.tenantId,
      fullName: payload.fullName,
      studentCode: payload.studentCode,
      gender: payload.gender,
    }
    this.students.push(next)
    return next
  }

  update(tenantId: string, id: string, payload: UpdateStudentDto): StudentRecord {
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
    const idx = this.students.findIndex(
      (student) => student.tenantId === tenantId && student.id === id
    )
    if (idx < 0) {
      throw new NotFoundException("Student not found")
    }
    this.students.splice(idx, 1)
    return { success: true }
  }
}
