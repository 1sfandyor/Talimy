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
  @UsePipes(new ZodValidationPipe(listClassesQuerySchema))
  list(@Query() query: ListClassesQueryDto) {
    return this.classesService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.classesService.getById(tenantId, id)
  }

  @Get(":id/students")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  students(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.classesService.getStudents(tenantId, id)
  }

  @Get(":id/teachers")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  teachers(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.classesService.getTeachers(tenantId, id)
  }

  @Get(":id/schedule")
  schedule(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Param("id") id: string
  ) {
    return this.classesService.getSchedule(query.tenantId, id)
  }

  @Get(":id/stats")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  stats(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.classesService.getStats(tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(createClassSchema))
  create(@Body() payload: CreateClassDto) {
    return this.classesService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(updateClassSchema))
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateClassDto
  ) {
    return this.classesService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.classesService.delete(tenantId, id)
  }
}
