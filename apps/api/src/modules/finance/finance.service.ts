import { Injectable } from "@nestjs/common"

import { FinanceRepository } from "./finance.repository"
import type { CreateFeeStructureDto, UpdateFeeStructureDto } from "./dto/fee-structure.dto"
import type { CreateInvoiceDto } from "./dto/create-invoice.dto"
import type { CreatePaymentDto, UpdatePaymentDto } from "./dto/create-payment.dto"
import type { CreatePaymentPlanDto, UpdatePaymentPlanDto } from "./dto/payment-plan.dto"

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  getOverview(tenantId: string) {
    return this.repository.getOverview(tenantId)
  }

  getPaymentsSummary(tenantId: string) {
    return this.repository.getPaymentsSummary(tenantId)
  }

  listFeeStructures(tenantId: string) {
    return this.repository.listFeeStructures(tenantId)
  }

  getFeeStructureById(tenantId: string, id: string) {
    return this.repository.getFeeStructureById(tenantId, id)
  }

  createFeeStructure(payload: CreateFeeStructureDto) {
    return this.repository.createFeeStructure(payload)
  }

  updateFeeStructure(tenantId: string, id: string, payload: UpdateFeeStructureDto) {
    return this.repository.updateFeeStructure(tenantId, id, payload)
  }

  deleteFeeStructure(tenantId: string, id: string) {
    return this.repository.deleteFeeStructure(tenantId, id)
  }

  listPaymentPlans(tenantId: string) {
    return this.repository.listPaymentPlans(tenantId)
  }

  createPaymentPlan(payload: CreatePaymentPlanDto) {
    return this.repository.createPaymentPlan(payload)
  }

  updatePaymentPlan(tenantId: string, id: string, payload: UpdatePaymentPlanDto) {
    return this.repository.updatePaymentPlan(tenantId, id, payload)
  }

  deletePaymentPlan(tenantId: string, id: string) {
    return this.repository.deletePaymentPlan(tenantId, id)
  }

  listPayments(tenantId: string) {
    return this.repository.listPayments(tenantId)
  }

  createPayment(payload: CreatePaymentDto) {
    return this.repository.createPayment(payload)
  }

  updatePayment(tenantId: string, id: string, payload: UpdatePaymentDto) {
    return this.repository.updatePayment(tenantId, id, payload)
  }

  listInvoices(tenantId: string) {
    return this.repository.listInvoices(tenantId)
  }

  createInvoice(payload: CreateInvoiceDto) {
    return this.repository.createInvoice(payload)
  }
}
