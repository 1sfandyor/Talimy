import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { TenantGuard } from "@/common/guards/tenant.guard"
import { AuthGuard } from "@/common/guards/auth.guard"

import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersService } from "./users.service"

@Controller("users")
@UseGuards(AuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query("tenantId") tenantId: string) {
    return this.usersService.list(tenantId)
  }

  @Get(":id")
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.usersService.getById(tenantId, id)
  }

  @Post()
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload)
  }

  @Patch(":id")
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateUserDto
  ) {
    return this.usersService.update(tenantId, id, payload)
  }

  @Delete(":id")
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.usersService.delete(tenantId, id)
  }
}
