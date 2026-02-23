import { Injectable } from "@nestjs/common"
import { classes, db, feeStructures, invoices, paymentPlans, payments, students } from "@talimy/database"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"

import type { FinanceOverviewView, FinancePaymentsSummaryView } from "./finance.types"
import type { CreateFeeStructureDto, UpdateFeeStructureDto } from "./dto/fee-structure.dto"
import type { CreateInvoiceDto } from "./dto/create-invoice.dto"
import type { CreatePaymentDto, UpdatePaymentDto } from "./dto/create-payment.dto"
import type { CreatePaymentPlanDto, UpdatePaymentPlanDto } from "./dto/payment-plan.dto"
import { BadRequestException, NotFoundException } from "@nestjs/common"

type InvoiceItemRecord = {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

@Injectable()
export class FinanceRepository {
  async getOverview(tenantId: string): Promise<FinanceOverviewView> {
    const [paymentsTotals] = await db
      .select({
        totalPayments: sql<number>`count(*)::int`,
        paidPayments: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
        totalCollectedAmount: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)::text`,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))

    const [invoiceTotals] = await db
      .select({
        totalInvoices: sql<number>`count(*)::int`,
        unpaidInvoices: sql<number>`count(*) filter (where ${invoices.status} in ('issued', 'overdue'))::int`,
        totalInvoicedAmount: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)::text`,
      })
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), isNull(invoices.deletedAt)))

    return {
      tenantId,
      payments: {
        totalCount: paymentsTotals?.totalPayments ?? 0,
        paidCount: paymentsTotals?.paidPayments ?? 0,
        totalCollectedAmount: paymentsTotals?.totalCollectedAmount ?? "0",
      },
      invoices: {
        totalCount: invoiceTotals?.totalInvoices ?? 0,
        unpaidCount: invoiceTotals?.unpaidInvoices ?? 0,
        totalInvoicedAmount: invoiceTotals?.totalInvoicedAmount ?? "0",
      },
    }
  }

  async getPaymentsSummary(tenantId: string): Promise<FinancePaymentsSummaryView> {
    const [row] = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        paidCount: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
        pendingCount: sql<number>`count(*) filter (where ${payments.status} = 'pending')::int`,
        overdueCount: sql<number>`count(*) filter (where ${payments.status} = 'overdue')::int`,
        failedCount: sql<number>`count(*) filter (where ${payments.status} = 'failed')::int`,
        totalAmount: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
        paidAmount: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)::text`,
        pendingAmount: sql<string>`coalesce(sum(case when ${payments.status} = 'pending' then ${payments.amount} else 0 end), 0)::text`,
        overdueAmount: sql<string>`coalesce(sum(case when ${payments.status} = 'overdue' then ${payments.amount} else 0 end), 0)::text`,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))

    return {
      tenantId,
      counts: {
        total: row?.totalCount ?? 0,
        paid: row?.paidCount ?? 0,
        pending: row?.pendingCount ?? 0,
        overdue: row?.overdueCount ?? 0,
        failed: row?.failedCount ?? 0,
      },
      amounts: {
        total: row?.totalAmount ?? "0",
        paid: row?.paidAmount ?? "0",
        pending: row?.pendingAmount ?? "0",
        overdue: row?.overdueAmount ?? "0",
      },
    }
  }

  async listFeeStructures(tenantId: string) {
    return db
      .select()
      .from(feeStructures)
      .where(and(eq(feeStructures.tenantId, tenantId), isNull(feeStructures.deletedAt)))
      .orderBy(desc(feeStructures.createdAt))
  }

  async getFeeStructureById(tenantId: string, id: string) {
    return this.findFeeStructureOrThrow(tenantId, id)
  }

  async createFeeStructure(payload: CreateFeeStructureDto) {
    if (payload.classId) {
      await this.assertClassInTenant(payload.tenantId, payload.classId)
    }

    const [created] = await db
      .insert(feeStructures)
      .values({
        tenantId: payload.tenantId,
        name: payload.name,
        amount: this.toMoney(payload.amount),
        frequency: payload.frequency ?? "monthly",
        classId: payload.classId ?? null,
        description: payload.description ?? null,
      })
      .returning()

    if (!created) throw new BadRequestException("Failed to create fee structure")
    return created
  }

  async updateFeeStructure(tenantId: string, id: string, payload: UpdateFeeStructureDto) {
    await this.findFeeStructureOrThrow(tenantId, id)

    if (typeof payload.classId !== "undefined" && payload.classId !== null) {
      await this.assertClassInTenant(tenantId, payload.classId)
    }

    const updatePayload: Partial<typeof feeStructures.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (payload.name) updatePayload.name = payload.name
    if (typeof payload.amount === "number") updatePayload.amount = this.toMoney(payload.amount)
    if (payload.frequency) updatePayload.frequency = payload.frequency
    if (typeof payload.classId !== "undefined") updatePayload.classId = payload.classId
    if (typeof payload.description !== "undefined") updatePayload.description = payload.description

    const [updated] = await db
      .update(feeStructures)
      .set(updatePayload)
      .where(
        and(eq(feeStructures.id, id), eq(feeStructures.tenantId, tenantId), isNull(feeStructures.deletedAt))
      )
      .returning()

    if (!updated) throw new NotFoundException("Fee structure not found")
    return updated
  }

  async deleteFeeStructure(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findFeeStructureOrThrow(tenantId, id)

    await db
      .update(feeStructures)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(feeStructures.id, id), eq(feeStructures.tenantId, tenantId), isNull(feeStructures.deletedAt))
      )

    return { success: true }
  }

  async listPaymentPlans(tenantId: string) {
    return db
      .select()
      .from(paymentPlans)
      .where(and(eq(paymentPlans.tenantId, tenantId), isNull(paymentPlans.deletedAt)))
      .orderBy(asc(paymentPlans.dueDate), desc(paymentPlans.createdAt))
  }

  async createPaymentPlan(payload: CreatePaymentPlanDto) {
    await this.assertStudentInTenant(payload.tenantId, payload.studentId)
    await this.assertFeeStructureInTenant(payload.tenantId, payload.feeStructureId)

    const paidAmount = payload.paidAmount ?? 0
    if (paidAmount > payload.totalAmount) {
      throw new BadRequestException("paidAmount cannot exceed totalAmount")
    }

    const [created] = await db
      .insert(paymentPlans)
      .values({
        tenantId: payload.tenantId,
        studentId: payload.studentId,
        feeStructureId: payload.feeStructureId,
        totalAmount: this.toMoney(payload.totalAmount),
        paidAmount: this.toMoney(paidAmount),
        dueDate: payload.dueDate,
      })
      .returning()

    if (!created) throw new BadRequestException("Failed to create payment plan")
    return created
  }

  async updatePaymentPlan(tenantId: string, id: string, payload: UpdatePaymentPlanDto) {
    const plan = await this.findPaymentPlanOrThrow(tenantId, id)

    if (payload.feeStructureId) {
      await this.assertFeeStructureInTenant(tenantId, payload.feeStructureId)
    }

    const totalAmount = payload.totalAmount ?? Number(plan.totalAmount)
    const paidAmount = payload.paidAmount ?? Number(plan.paidAmount)
    if (paidAmount > totalAmount) {
      throw new BadRequestException("paidAmount cannot exceed totalAmount")
    }

    const updatePayload: Partial<typeof paymentPlans.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (payload.feeStructureId) updatePayload.feeStructureId = payload.feeStructureId
    if (typeof payload.totalAmount === "number") updatePayload.totalAmount = this.toMoney(payload.totalAmount)
    if (typeof payload.paidAmount === "number") updatePayload.paidAmount = this.toMoney(payload.paidAmount)
    if (payload.dueDate) updatePayload.dueDate = payload.dueDate

    const [updated] = await db
      .update(paymentPlans)
      .set(updatePayload)
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId), isNull(paymentPlans.deletedAt)))
      .returning()

    if (!updated) throw new NotFoundException("Payment plan not found")
    return updated
  }

  async deletePaymentPlan(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findPaymentPlanOrThrow(tenantId, id)

    await db
      .update(paymentPlans)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId), isNull(paymentPlans.deletedAt)))

    return { success: true }
  }

  async listPayments(tenantId: string) {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))
      .orderBy(desc(payments.date), desc(payments.createdAt))
  }

  async createPayment(payload: CreatePaymentDto) {
    await this.assertStudentInTenant(payload.tenantId, payload.studentId)

    const [created] = await db
      .insert(payments)
      .values({
        tenantId: payload.tenantId,
        studentId: payload.studentId,
        amount: this.toMoney(payload.amount),
        method: payload.method,
        status: payload.status ?? "paid",
        date: payload.date,
        receiptNumber: payload.receiptNumber ?? null,
      })
      .returning()

    if (!created) throw new BadRequestException("Failed to create payment")
    return created
  }

  async updatePayment(tenantId: string, id: string, payload: UpdatePaymentDto) {
    await this.findPaymentOrThrow(tenantId, id)

    const updatePayload: Partial<typeof payments.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (typeof payload.amount === "number") updatePayload.amount = this.toMoney(payload.amount)
    if (payload.method) updatePayload.method = payload.method
    if (payload.status) updatePayload.status = payload.status
    if (payload.date) updatePayload.date = payload.date
    if (typeof payload.receiptNumber !== "undefined") updatePayload.receiptNumber = payload.receiptNumber

    const [updated] = await db
      .update(payments)
      .set(updatePayload)
      .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))
      .returning()

    if (!updated) throw new NotFoundException("Payment not found")
    return updated
  }

  async listInvoices(tenantId: string) {
    return db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.issuedDate), desc(invoices.createdAt))
  }

  async createInvoice(payload: CreateInvoiceDto) {
    await this.assertStudentInTenant(payload.tenantId, payload.studentId)

    const normalizedItems = payload.items.map((item) => {
      const amount = item.amount ?? item.quantity * item.unitPrice
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount,
      } satisfies InvoiceItemRecord
    })

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0)

    const [created] = await db
      .insert(invoices)
      .values({
        tenantId: payload.tenantId,
        studentId: payload.studentId,
        items: normalizedItems,
        totalAmount: this.toMoney(totalAmount),
        status: payload.status ?? "issued",
        issuedDate: payload.issuedDate,
        dueDate: payload.dueDate,
      })
      .returning()

    if (!created) throw new BadRequestException("Failed to create invoice")
    return created
  }

  private async findFeeStructureOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(feeStructures)
      .where(and(eq(feeStructures.id, id), eq(feeStructures.tenantId, tenantId), isNull(feeStructures.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Fee structure not found")
    return row
  }

  private async findPaymentPlanOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(paymentPlans)
      .where(and(eq(paymentPlans.id, id), eq(paymentPlans.tenantId, tenantId), isNull(paymentPlans.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Payment plan not found")
    return row
  }

  private async findPaymentOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId), isNull(payments.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundException("Payment not found")
    return row
  }

  private async assertClassInTenant(tenantId: string, classId: string): Promise<void> {
    const [row] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
      .limit(1)

    if (!row) throw new BadRequestException("Class not found in tenant")
  }

  private async assertStudentInTenant(tenantId: string, studentId: string): Promise<void> {
    const [row] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId), isNull(students.deletedAt)))
      .limit(1)

    if (!row) throw new BadRequestException("Student not found in tenant")
  }

  private async assertFeeStructureInTenant(tenantId: string, feeStructureId: string): Promise<void> {
    const [row] = await db
      .select({ id: feeStructures.id })
      .from(feeStructures)
      .where(
        and(
          eq(feeStructures.id, feeStructureId),
          eq(feeStructures.tenantId, tenantId),
          isNull(feeStructures.deletedAt)
        )
      )
      .limit(1)

    if (!row) throw new BadRequestException("Fee structure not found in tenant")
  }

  private toMoney(value: number): string {
    return value.toFixed(2)
  }
}
