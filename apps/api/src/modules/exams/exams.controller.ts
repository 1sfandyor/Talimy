import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  createExamSchema,
  enterExamResultsSchema,
  examQuerySchema,
  updateExamSchema,
  userTenantQuerySchema,
  uuidStringSchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"
import { ZodParamFieldPipe } from "@/common/pipes/zod-param-field.pipe"

import { CreateExamDto, UpdateExamDto } from "./dto/create-exam.dto"
import { EnterExamResultsDto } from "./dto/exam-result.dto"
import { ExamQueryDto } from "./dto/exam-query.dto"
import { ExamsService } from "./exams.service"

@Controller("exams")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(examQuerySchema)) queryInput: unknown) {
    const query = queryInput as ExamQueryDto
    return this.examsService.list(query)
  }

  @Get("student/:studentId/results")
  getResultsByStudent(
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(examQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as ExamQueryDto
    return this.examsService.getResultsByStudent(query.tenantId, studentId, query)
  }

  @Get(":id/results")
  getResultsByExam(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(examQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as ExamQueryDto
    return this.examsService.getResultsByExam(query.tenantId, id, query)
  }

  @Get(":id/stats")
  getStats(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.examsService.getStats(query.tenantId, id)
  }

  @Get(":id")
  getById(
    @Param("id", new ZodParamFieldPipe(uuidStringSchema)) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.examsService.getById(query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createExamSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateExamDto
    return this.examsService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(updateExamSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateExamDto
    return this.examsService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.examsService.delete(query.tenantId, id)
  }

  @Post(":id/results")
  @Roles("platform_admin", "school_admin", "teacher")
  enterResults(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(enterExamResultsSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as EnterExamResultsDto
    return this.examsService.enterResults(query.tenantId, id, payload)
  }
}
