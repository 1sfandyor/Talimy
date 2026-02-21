import { Injectable } from "@nestjs/common"

import { AttendanceQueueService } from "./attendance-queue.service"
import { AttendanceRepository } from "./attendance.repository"
import { AttendanceQueryDto } from "./dto/attendance-query.dto"
import { MarkAttendanceDto } from "./dto/mark-attendance.dto"

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly queueService: AttendanceQueueService
  ) {}

  async mark(payload: MarkAttendanceDto) {
    const result = await this.repository.mark(payload)
    const absentStudentIds = payload.records
      .filter((record) => record.status === "absent")
      .map((record) => record.studentId)
    await this.queueService.enqueueAbsentAlerts({
      tenantId: payload.tenantId,
      classId: payload.classId,
      date: payload.date,
      studentIds: absentStudentIds,
    })
    return result
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
