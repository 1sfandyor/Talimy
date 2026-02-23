import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from "@nestjs/common"
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

  @Get("fee-structures")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  listFeeStructures(@Query() query: { tenantId: string }) {
    return this.financeService.listFeeStructures(query.tenantId)
  }

  @Get("fee-structures/:id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getFeeStructureById(@Query() query: { tenantId: string }, @Param("id") id: string) {
    return this.financeService.getFeeStructureById(query.tenantId, id)
  }

  @Post("fee-structures")
  @Roles("platform_admin", "school_admin")
  createFeeStructure(@Body(new ZodValidationPipe(createFeeStructureSchema)) payload: CreateFeeStructureDto) {
    return this.financeService.createFeeStructure(payload)
  }

  @Patch("fee-structures/:id")
  @Roles("platform_admin", "school_admin")
  updateFeeStructure(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFeeStructureSchema)) payload: UpdateFeeStructureDto
  ) {
    return this.financeService.updateFeeStructure(query.tenantId, id, payload)
  }

  @Delete("fee-structures/:id")
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  deleteFeeStructure(@Query() query: { tenantId: string }, @Param("id") id: string) {
    return this.financeService.deleteFeeStructure(query.tenantId, id)
  }

  @Get("payment-plans")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  listPaymentPlans(@Query() query: { tenantId: string }) {
    return this.financeService.listPaymentPlans(query.tenantId)
  }

  @Post("payment-plans")
  @Roles("platform_admin", "school_admin")
  createPaymentPlan(@Body(new ZodValidationPipe(createPaymentPlanSchema)) payload: CreatePaymentPlanDto) {
    return this.financeService.createPaymentPlan(payload)
  }

  @Patch("payment-plans/:id")
  @Roles("platform_admin", "school_admin")
  updatePaymentPlan(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePaymentPlanSchema)) payload: UpdatePaymentPlanDto
  ) {
    return this.financeService.updatePaymentPlan(query.tenantId, id, payload)
  }

  @Delete("payment-plans/:id")
  @Roles("platform_admin", "school_admin")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  deletePaymentPlan(@Query() query: { tenantId: string }, @Param("id") id: string) {
    return this.financeService.deletePaymentPlan(query.tenantId, id)
  }

  @Get("payments")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  listPayments(@Query() query: { tenantId: string }) {
    return this.financeService.listPayments(query.tenantId)
  }

  @Post("payments")
  @Roles("platform_admin", "school_admin")
  createPayment(@Body(new ZodValidationPipe(createPaymentSchema)) payload: CreatePaymentDto) {
    return this.financeService.createPayment(payload)
  }

  @Patch("payments/:id")
  @Roles("platform_admin", "school_admin")
  updatePayment(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) payload: UpdatePaymentDto
  ) {
    return this.financeService.updatePayment(query.tenantId, id, payload)
  }

  @Get("invoices")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  listInvoices(@Query() query: { tenantId: string }) {
    return this.financeService.listInvoices(query.tenantId)
  }

  @Post("invoices")
  @Roles("platform_admin", "school_admin")
  createInvoice(@Body(new ZodValidationPipe(createInvoiceSchema)) payload: CreateInvoiceDto) {
    return this.financeService.createInvoice(payload)
  }
}
