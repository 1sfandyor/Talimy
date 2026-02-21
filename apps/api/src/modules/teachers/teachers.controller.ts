import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { AuthGuard } from "@/common/guards/auth.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"
import { TeachersService } from "./teachers.service"

@Controller("teachers")
@UseGuards(AuthGuard, TenantGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  list(@Query("tenantId") tenantId: string) {
    return this.teachersService.list(tenantId)
  }

  @Get(":id")
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getById(tenantId, id)
  }

  @Post()
  create(@Body() payload: CreateTeacherDto) {
    return this.teachersService.create(payload)
  }

  @Patch(":id")
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateTeacherDto
  ) {
    return this.teachersService.update(tenantId, id, payload)
  }

  @Delete(":id")
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.delete(tenantId, id)
  }
}
