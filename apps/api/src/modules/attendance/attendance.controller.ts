import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { attendanceQuerySchema, markAttendanceSchema } from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { AttendanceService } from "./attendance.service"
import { AttendanceQueryDto } from "./dto/attendance-query.dto"
import { MarkAttendanceDto } from "./dto/mark-attendance.dto"

@Controller("attendance")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post("mark")
  mark(@Body(new ZodValidationPipe(markAttendanceSchema)) payloadInput: unknown) {
    const payload = payloadInput as MarkAttendanceDto
    return this.attendanceService.mark(payload)
  }

  @Get("class/:classId")
  getByClass(
    @Param("classId") classId: string,
    @Query(new ZodValidationPipe(attendanceQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as AttendanceQueryDto
    return this.attendanceService.getByClass(query.tenantId, classId, query)
  }

  @Get("student/:studentId")
  getByStudent(
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(attendanceQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as AttendanceQueryDto
    return this.attendanceService.getByStudent(query.tenantId, studentId, query)
  }

  @Get("report")
  report(@Query(new ZodValidationPipe(attendanceQuerySchema)) queryInput: unknown) {
    const query = queryInput as AttendanceQueryDto
    return this.attendanceService.report(query)
  }
}
