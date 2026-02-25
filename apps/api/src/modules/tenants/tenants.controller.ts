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
} from "@nestjs/common"
import {
  createTenantSchema,
  listTenantsQuerySchema,
  updateTenantBillingSchema,
  updateTenantSchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

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
  list(@Query(new ZodValidationPipe(listTenantsQuerySchema)) query: unknown) {
    return this.tenantsService.list(query as ListTenantsQueryDto)
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.tenantsService.getById(id)
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTenantSchema)) payload: unknown) {
    return this.tenantsService.create(payload as CreateTenantDto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateTenantSchema)) payload: unknown) {
    return this.tenantsService.update(id, payload as UpdateTenantDto)
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
  updateBilling(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantBillingSchema)) payload: unknown
  ) {
    return this.tenantsService.updateBilling(id, payload as UpdateTenantBillingDto)
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tenantsService.delete(id)
  }
}
