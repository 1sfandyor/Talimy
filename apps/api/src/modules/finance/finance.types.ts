export type FinanceOverviewView = {
  tenantId: string
  payments: {
    totalCount: number
    paidCount: number
    totalCollectedAmount: string
  }
  invoices: {
    totalCount: number
    unpaidCount: number
    totalInvoicedAmount: string
  }
}

export type FinancePaymentsSummaryView = {
  tenantId: string
  counts: {
    total: number
    paid: number
    pending: number
    overdue: number
    failed: number
  }
  amounts: {
    total: string
    paid: string
    pending: string
    overdue: string
  }
}
