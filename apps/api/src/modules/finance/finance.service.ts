import { Injectable } from "@nestjs/common"

import { FinanceRepository } from "./finance.repository"

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  getOverview(tenantId: string) {
    return this.repository.getOverview(tenantId)
  }

  getPaymentsSummary(tenantId: string) {
    return this.repository.getPaymentsSummary(tenantId)
  }
}
