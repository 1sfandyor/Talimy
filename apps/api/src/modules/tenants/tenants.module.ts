import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { TenantsController } from "./tenants.controller"
import { TenantsRepository } from "./tenants.repository"
import { TenantsService } from "./tenants.service"

@Module({
  imports: [AuthModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
