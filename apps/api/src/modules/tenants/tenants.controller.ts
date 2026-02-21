import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"
import { TenantsService } from "./tenants.service"

@Controller("tenants")
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
