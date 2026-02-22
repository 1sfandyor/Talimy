import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { ExamsController } from "./exams.controller"
import { ExamsRepository } from "./exams.repository"
import { ExamsService } from "./exams.service"

@Module({
  imports: [AuthModule],
  controllers: [ExamsController],
  providers: [ExamsService, ExamsRepository],
  exports: [ExamsService],
})
export class ExamsModule {}
