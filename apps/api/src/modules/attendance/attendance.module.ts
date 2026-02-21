import { Module } from "@nestjs/common"

import { AttendanceController } from "./attendance.controller"
import { AttendanceQueueService } from "./attendance-queue.service"
import { AttendanceRepository } from "./attendance.repository"
import { AttendanceService } from "./attendance.service"

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, AttendanceQueueService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
