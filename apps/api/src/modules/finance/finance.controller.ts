import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createFeeStructureSchema,
  createInvoiceSchema,
  createPaymentPlanSchema,
  createPaymentSchema,
  updateFeeStructureSchema,
  updatePaymentPlanSchema,
  updatePaymentSchema,
  userTenantQuerySchema,
} from "@talimy/shared"
import { z } from "zod"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { FinanceService } from "./finance.service"
import { CreateFeeStructureDto, UpdateFeeStructureDto } from "./dto/fee-structure.dto"
import { CreateInvoiceDto } from "./dto/create-invoice.dto"
import { CreatePaymentDto, UpdatePaymentDto } from "./dto/create-payment.dto"
import { CreatePaymentPlanDto, UpdatePaymentPlanDto } from "./dto/payment-plan.dto"
import { CacheService } from "../cache/cache.service"
import {
  CACHE_TTLS,
  financeCachePrefix,
  financeOverviewCacheKey,
  financePaymentsSummaryCacheKey,
} from "../cache/cache.keys"

@Controller("finance")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly cacheService: CacheService
  ) {}
  private static readonly idParamSchema = z.object({ id: z.string().uuid() })

  @Get("overview")
  getOverview(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.cacheService.wrapJson(
      financeOverviewCacheKey(query.tenantId),
      CACHE_TTLS.financeOverviewSeconds,
      () => this.financeService.getOverview(query.tenantId)
    )
  }

  @Get("payments/summary")
  getPaymentsSummary(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.cacheService.wrapJson(
      financePaymentsSummaryCacheKey(query.tenantId),
      CACHE_TTLS.financePaymentsSummarySeconds,
      () => this.financeService.getPaymentsSummary(query.tenantId)
    )
  }

  @Get("fee-structures")
  listFeeStructures(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.listFeeStructures(query.tenantId)
  }

  @Get("fee-structures/:id")
  getFeeStructureById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.financeService.getFeeStructureById(query.tenantId, params.id)
  }

  @Post("fee-structures")
  @Roles("platform_admin", "school_admin")
  createFeeStructure(@Body(new ZodValidationPipe(createFeeStructureSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateFeeStructureDto
    return this.financeService.createFeeStructure(payload).then(async (created) => {
      await this.invalidateFinanceCache(payload.tenantId)
      return created
    })
  }

  @Patch("fee-structures/:id")
  @Roles("platform_admin", "school_admin")
  updateFeeStructure(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown,
    @Body(new ZodValidationPipe(updateFeeStructureSchema)) payloadInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateFeeStructureDto
    return this.financeService
      .updateFeeStructure(query.tenantId, params.id, payload)
      .then(async (updated) => {
        await this.invalidateFinanceCache(query.tenantId)
        return updated
      })
  }

  @Delete("fee-structures/:id")
  @Roles("platform_admin", "school_admin")
  deleteFeeStructure(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.financeService
      .deleteFeeStructure(query.tenantId, params.id)
      .then(async (result) => {
        await this.invalidateFinanceCache(query.tenantId)
        return result
      })
  }

  @Get("payment-plans")
  listPaymentPlans(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.listPaymentPlans(query.tenantId)
  }

  @Post("payment-plans")
  @Roles("platform_admin", "school_admin")
  createPaymentPlan(@Body(new ZodValidationPipe(createPaymentPlanSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreatePaymentPlanDto
    return this.financeService.createPaymentPlan(payload).then(async (created) => {
      await this.invalidateFinanceCache(payload.tenantId)
      return created
    })
  }

  @Patch("payment-plans/:id")
  @Roles("platform_admin", "school_admin")
  updatePaymentPlan(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown,
    @Body(new ZodValidationPipe(updatePaymentPlanSchema)) payloadInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdatePaymentPlanDto
    return this.financeService
      .updatePaymentPlan(query.tenantId, params.id, payload)
      .then(async (updated) => {
        await this.invalidateFinanceCache(query.tenantId)
        return updated
      })
  }

  @Delete("payment-plans/:id")
  @Roles("platform_admin", "school_admin")
  deletePaymentPlan(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.financeService.deletePaymentPlan(query.tenantId, params.id).then(async (result) => {
      await this.invalidateFinanceCache(query.tenantId)
      return result
    })
  }

  @Get("payments")
  listPayments(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.listPayments(query.tenantId)
  }

  @Post("payments")
  @Roles("platform_admin", "school_admin")
  createPayment(@Body(new ZodValidationPipe(createPaymentSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreatePaymentDto
    return this.financeService.createPayment(payload).then(async (created) => {
      await this.invalidateFinanceCache(payload.tenantId)
      return created
    })
  }

  @Patch("payments/:id")
  @Roles("platform_admin", "school_admin")
  updatePayment(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown,
    @Body(new ZodValidationPipe(updatePaymentSchema)) payloadInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdatePaymentDto
    return this.financeService
      .updatePayment(query.tenantId, params.id, payload)
      .then(async (updated) => {
        await this.invalidateFinanceCache(query.tenantId)
        return updated
      })
  }

  @Get("invoices")
  listInvoices(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.listInvoices(query.tenantId)
  }

  @Post("invoices")
  @Roles("platform_admin", "school_admin")
  createInvoice(@Body(new ZodValidationPipe(createInvoiceSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateInvoiceDto
    return this.financeService.createInvoice(payload).then(async (created) => {
      await this.invalidateFinanceCache(payload.tenantId)
      return created
    })
  }

  private async invalidateFinanceCache(tenantId: string): Promise<void> {
    await this.cacheService.delByPrefix(financeCachePrefix(tenantId))
  }
}
