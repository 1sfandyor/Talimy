import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from "@nestjs/common"
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
  @UsePipes(new ZodValidationPipe(markAttendanceSchema))
  mark(@Body() payload: MarkAttendanceDto) {
    return this.attendanceService.mark(payload)
  }

  @Get("class/:classId")
  @UsePipes(new ZodValidationPipe(attendanceQuerySchema))
  getByClass(
    @Param("classId") classId: string,
    @Query("tenantId") tenantId: string,
    @Query() query: AttendanceQueryDto
  ) {
    return this.attendanceService.getByClass(tenantId, classId, query)
  }

  @Get("student/:studentId")
  @UsePipes(new ZodValidationPipe(attendanceQuerySchema))
  getByStudent(
    @Param("studentId") studentId: string,
    @Query("tenantId") tenantId: string,
    @Query() query: AttendanceQueryDto
  ) {
    return this.attendanceService.getByStudent(tenantId, studentId, query)
  }

  @Get("report")
  @UsePipes(new ZodValidationPipe(attendanceQuerySchema))
  report(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.report(query)
  }
}
