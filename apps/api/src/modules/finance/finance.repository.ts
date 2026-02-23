import { Injectable } from "@nestjs/common"
import { db, invoices, payments } from "@talimy/database"
import { and, eq, isNull, sql } from "drizzle-orm"

import type { FinanceOverviewView, FinancePaymentsSummaryView } from "./finance.types"

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
}
