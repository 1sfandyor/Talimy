import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { ClassesController } from "./classes.controller"
import { ClassesRepository } from "./classes.repository"
import { ClassesService } from "./classes.service"

@Module({
  imports: [AuthModule],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesRepository],
  exports: [ClassesService],
})
export class ClassesModule {}
