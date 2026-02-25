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

@Controller("finance")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}
  private static readonly idParamSchema = z.object({ id: z.string().uuid() })

  @Get("overview")
  getOverview(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.getOverview(query.tenantId)
  }

  @Get("payments/summary")
  getPaymentsSummary(@Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown) {
    const query = queryInput as { tenantId: string }
    return this.financeService.getPaymentsSummary(query.tenantId)
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
    return this.financeService.createFeeStructure(payload)
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
    return this.financeService.updateFeeStructure(query.tenantId, params.id, payload)
  }

  @Delete("fee-structures/:id")
  @Roles("platform_admin", "school_admin")
  deleteFeeStructure(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.financeService.deleteFeeStructure(query.tenantId, params.id)
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
    return this.financeService.createPaymentPlan(payload)
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
    return this.financeService.updatePaymentPlan(query.tenantId, params.id, payload)
  }

  @Delete("payment-plans/:id")
  @Roles("platform_admin", "school_admin")
  deletePaymentPlan(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param(new ZodValidationPipe(FinanceController.idParamSchema)) paramsInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.financeService.deletePaymentPlan(query.tenantId, params.id)
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
    return this.financeService.createPayment(payload)
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
    return this.financeService.updatePayment(query.tenantId, params.id, payload)
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
    return this.financeService.createInvoice(payload)
  }
}
