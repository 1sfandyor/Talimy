import {
  Body,
  Controller,
  Delete,
  Get,
  ParseUUIDPipe,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common"
import {
  createExamSchema,
  enterExamResultsSchema,
  examQuerySchema,
  updateExamSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

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
  @UsePipes(new ZodValidationPipe(examQuerySchema))
  list(@Query() query: ExamQueryDto) {
    return this.examsService.list(query)
  }

  @Get("student/:studentId/results")
  getResultsByStudent(
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(examQuerySchema)) query: ExamQueryDto
  ) {
    return this.examsService.getResultsByStudent(query.tenantId, studentId, query)
  }

  @Get(":id/results")
  getResultsByExam(@Param("id") id: string, @Query(new ZodValidationPipe(examQuerySchema)) query: ExamQueryDto) {
    return this.examsService.getResultsByExam(query.tenantId, id, query)
  }

  @Get(":id/stats")
  getStats(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.examsService.getStats(query.tenantId, id)
  }

  @Get(":id")
  getById(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("tenantId", new ParseUUIDPipe()) tenantId: string
  ) {
    return this.examsService.getById(tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createExamSchema)) payload: CreateExamDto) {
    return this.examsService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Body(new ZodValidationPipe(updateExamSchema)) payload: UpdateExamDto
  ) {
    return this.examsService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.examsService.delete(query.tenantId, id)
  }

  @Post(":id/results")
  @Roles("platform_admin", "school_admin", "teacher")
  enterResults(
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Body(new ZodValidationPipe(enterExamResultsSchema)) payload: EnterExamResultsDto
  ) {
    return this.examsService.enterResults(tenantId, id, payload)
  }
}
