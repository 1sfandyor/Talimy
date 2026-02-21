import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { ListTenantsQueryDto } from "./dto/list-tenants-query.dto"
import { UpdateTenantBillingDto } from "./dto/update-tenant-billing.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"
import { TenantsService } from "./tenants.service"

@Controller("tenants")
@UseGuards(AuthGuard, RolesGuard)
@Roles("platform_admin")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQueryDto) {
    return this.tenantsService.list(query)
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

  @Patch(":id/activate")
  activate(@Param("id") id: string) {
    return this.tenantsService.activate(id)
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.tenantsService.deactivate(id)
  }

  @Get(":id/stats")
  stats(@Param("id") id: string) {
    return this.tenantsService.getStats(id)
  }

  @Get(":id/billing")
  billing(@Param("id") id: string) {
    return this.tenantsService.getBilling(id)
  }

  @Patch(":id/billing")
  updateBilling(@Param("id") id: string, @Body() payload: UpdateTenantBillingDto) {
    return this.tenantsService.updateBilling(id, payload)
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tenantsService.delete(id)
  }
}
