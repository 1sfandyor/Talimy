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
  UsePipes,
} from "@nestjs/common"
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
  @UsePipes(new ZodValidationPipe(createGradeSchema))
  enter(@Body() payload: CreateGradeDto) {
    return this.gradesService.enter(payload)
  }

  @Get()
  @UsePipes(new ZodValidationPipe(gradeQuerySchema))
  list(@Query() query: GradeQueryDto) {
    return this.gradesService.list(query)
  }

  @Get("student/:studentId")
  byStudent(
    @Param("studentId") studentId: string,
    @Query(new ZodValidationPipe(gradeQuerySchema)) query: GradeQueryDto
  ) {
    return this.gradesService.getByStudent(query.tenantId, studentId, query)
  }

  @Get("class/:classId")
  byClass(
    @Param("classId") classId: string,
    @Query(new ZodValidationPipe(gradeQuerySchema)) query: GradeQueryDto
  ) {
    return this.gradesService.getByClass(query.tenantId, classId, query)
  }

  @Get("report")
  @UsePipes(new ZodValidationPipe(gradeQuerySchema))
  report(@Query() query: GradeQueryDto) {
    return this.gradesService.report(query)
  }

  @Get("scales")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  listScales(@Query() query: { tenantId: string }) {
    return this.gradesService.listScales(query.tenantId)
  }

  @Post("scales")
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(createGradeScaleSchema))
  createScale(@Body() payload: CreateGradeScaleDto) {
    return this.gradesService.createScale(payload)
  }

  @Patch("scales/:id")
  @Roles("platform_admin", "school_admin")
  updateScale(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateGradeScaleSchema)) payload: UpdateGradeScaleDto
  ) {
    return this.gradesService.updateScale(tenantId, id, payload)
  }

  @Delete("scales/:id")
  @Roles("platform_admin", "school_admin")
  deleteScale(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Param("id") id: string
  ) {
    return this.gradesService.deleteScale(query.tenantId, id)
  }
}
