import { Module } from "@nestjs/common"

import { PermifyModule } from "../authz/permify/permify.module"
import { AuthModule } from "../auth/auth.module"
import { StudentsController } from "./students.controller"
import { StudentsRepository } from "./students.repository"
import { StudentsService } from "./students.service"
import { StudentsSummaryRepository } from "./students.summary.repository"

@Module({
  imports: [AuthModule, PermifyModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository, StudentsSummaryRepository],
  exports: [StudentsService],
})
export class StudentsModule {}
