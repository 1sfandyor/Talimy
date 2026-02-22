import { Module } from "@nestjs/common"

import { PermifyModule } from "../authz/permify/permify.module"
import { AuthModule } from "../auth/auth.module"
import { TeachersController } from "./teachers.controller"
import { TeachersRepository } from "./teachers.repository"
import { TeachersService } from "./teachers.service"

@Module({
  imports: [AuthModule, PermifyModule],
  controllers: [TeachersController],
  providers: [TeachersService, TeachersRepository],
  exports: [TeachersService],
})
export class TeachersModule {}
