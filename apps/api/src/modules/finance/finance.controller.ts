import { Controller, Get, Query, UseGuards, UsePipes } from "@nestjs/common"
import { userTenantQuerySchema } from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { FinanceService } from "./finance.service"

@Controller("finance")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("overview")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getOverview(@Query() query: { tenantId: string }) {
    return this.financeService.getOverview(query.tenantId)
  }

  @Get("payments/summary")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getPaymentsSummary(@Query() query: { tenantId: string }) {
    return this.financeService.getPaymentsSummary(query.tenantId)
  }
}
