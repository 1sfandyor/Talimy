import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createGradeScaleSchema,
  createGradeSchema,
  gradeQuerySchema,
  updateGradeScaleSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateGradeDto, CreateGradeScaleDto, UpdateGradeScaleDto } from "./dto/create-grade.dto"
import { GradeQueryDto } from "./dto/grade-query.dto"
import { GradesService } from "./grades.service"

@Controller("grades")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  enter(@Body(new ZodValidationPipe(createGradeSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateGradeDto
    return this.gradesService.enter(payload)
  }

  @Get()
  list(@Query(new ZodValidationPipe(gradeQuerySchema)) queryInput: unknown) {
    const query = queryInput as GradeQueryDto
    return this.gradesService.list(query)
  }

  @Get("student/:studentId")
  byStudent(
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(gradeQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as GradeQueryDto
    return this.gradesService.getByStudent(query.tenantId, studentId, query)
  }

  @Get("class/:classId")
  byClass(
    @Param("classId") classId: string,
    @Query(new ZodValidationPipe(gradeQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as GradeQueryDto
    return this.gradesService.getByClass(query.tenantId, classId, query)
  }

  @Get("report")
  report(@Query(new ZodValidationPipe(gradeQuerySchema)) queryInput: unknown) {
    const query = queryInput as GradeQueryDto
    return this.gradesService.report(query)
  }

  @Get("scales")
  listScales(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.gradesService.listScales(query.tenantId)
  }

  @Post("scales")
  @Roles("platform_admin", "school_admin")
  createScale(@Body(new ZodValidationPipe(createGradeScaleSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateGradeScaleDto
    return this.gradesService.createScale(payload)
  }

  @Patch("scales/:id")
  @Roles("platform_admin", "school_admin")
  updateScale(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateGradeScaleSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateGradeScaleDto
    return this.gradesService.updateScale(query.tenantId, id, payload)
  }

  @Delete("scales/:id")
  @Roles("platform_admin", "school_admin")
  deleteScale(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.gradesService.deleteScale(query.tenantId, id)
  }
}
