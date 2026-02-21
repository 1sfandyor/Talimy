import { Injectable } from "@nestjs/common"

import { AttendanceRepository } from "./attendance.repository"
import { AttendanceQueryDto } from "./dto/attendance-query.dto"
import { MarkAttendanceDto } from "./dto/mark-attendance.dto"

@Injectable()
export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  mark(payload: MarkAttendanceDto) {
    return this.repository.mark(payload)
  }

  getByClass(tenantId: string, classId: string, query: AttendanceQueryDto) {
    return this.repository.getByClass(tenantId, classId, query)
  }

  getByStudent(tenantId: string, studentId: string, query: AttendanceQueryDto) {
    return this.repository.getByStudent(tenantId, studentId, query)
  }

  report(query: AttendanceQueryDto) {
    return this.repository.report(query)
  }
}
