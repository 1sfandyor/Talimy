import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"
import { TenantsService } from "./tenants.service"

@Controller("tenants")
@UseGuards(AuthGuard, RolesGuard)
@Roles("platform_admin")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list() {
    return this.tenantsService.list()
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.tenantsService.getById(id)
  }

  @Post()
  create(@Body() payload: CreateTenantDto) {
    return this.tenantsService.create(payload)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdateTenantDto) {
    return this.tenantsService.update(id, payload)
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tenantsService.delete(id)
  }
}
