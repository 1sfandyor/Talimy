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
  createTeacherSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { ListTeachersQueryDto } from "./dto/list-teachers-query.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"
import { TeachersService } from "./teachers.service"

@Controller("teachers")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listTeachersQuerySchema))
  list(@Query() query: ListTeachersQueryDto) {
    return this.teachersService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getById(tenantId, id)
  }

  @Get(":id/schedule")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  schedule(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getSchedule(tenantId, id)
  }

  @Get(":id/classes")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  classes(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getClasses(tenantId, id)
  }

  @Get(":id/subjects")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  subjects(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getSubjects(tenantId, id)
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createTeacherSchema))
  create(@Body() payload: CreateTeacherDto) {
    return this.teachersService.create(payload)
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateTeacherSchema))
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateTeacherDto
  ) {
    return this.teachersService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.delete(tenantId, id)
  }
}
