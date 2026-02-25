import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createClassSchema,
  listClassesQuerySchema,
  updateClassSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { ClassesService } from "./classes.service"
import { CreateClassDto } from "./dto/create-class.dto"
import { ListClassesQueryDto } from "./dto/list-classes-query.dto"
import { UpdateClassDto } from "./dto/update-class.dto"

@Controller("classes")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listClassesQuerySchema)) queryInput: unknown) {
    const query = queryInput as ListClassesQueryDto
    return this.classesService.list(query)
  }

  @Get(":id")
  getById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.getById(query.tenantId, id)
  }

  @Get(":id/students")
  students(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.getStudents(query.tenantId, id)
  }

  @Get(":id/teachers")
  teachers(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.getTeachers(query.tenantId, id)
  }

  @Get(":id/schedule")
  schedule(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.getSchedule(query.tenantId, id)
  }

  @Get(":id/stats")
  stats(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.getStats(query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createClassSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateClassDto
    return this.classesService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClassSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateClassDto
    return this.classesService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.classesService.delete(query.tenantId, id)
  }
}
