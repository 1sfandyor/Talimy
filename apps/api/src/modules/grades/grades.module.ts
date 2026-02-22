import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { GradesController } from "./grades.controller"
import { GradesRepository } from "./grades.repository"
import { GradesService } from "./grades.service"

@Module({
  imports: [AuthModule],
  controllers: [GradesController],
  providers: [GradesService, GradesRepository],
  exports: [GradesService],
})
export class GradesModule {}
