import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { FinanceController } from "./finance.controller"
import { FinanceRepository } from "./finance.repository"
import { FinanceService } from "./finance.service"

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
