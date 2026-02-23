import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { AssignmentsController } from "./assignments.controller"
import { AssignmentsRepository } from "./assignments.repository"
import { AssignmentsService } from "./assignments.service"

@Module({
  imports: [AuthModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
