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
  createStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateStudentDto } from "./dto/create-student.dto"
import { ListStudentsQueryDto } from "./dto/list-students-query.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"
import { StudentsService } from "./students.service"

@Controller("students")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listStudentsQuerySchema))
  list(@Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getById(tenantId, id)
  }

  @Get(":id/grades")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  grades(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getGrades(tenantId, id)
  }

  @Get(":id/attendance")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  attendance(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getAttendance(tenantId, id)
  }

  @Get(":id/parents")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  parents(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getParents(tenantId, id)
  }

  @Get(":id/summary")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  summary(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.getSummary(tenantId, id)
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createStudentSchema))
  create(@Body() payload: CreateStudentDto) {
    return this.studentsService.create(payload)
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateStudentSchema))
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateStudentDto
  ) {
    return this.studentsService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.studentsService.delete(tenantId, id)
  }
}
