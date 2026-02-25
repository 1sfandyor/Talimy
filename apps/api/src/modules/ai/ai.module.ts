import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { AiController } from "./ai.controller"
import { AiOpenRouterClient } from "./ai.openrouter.client"
import { AiRepository } from "./ai.repository"
import { AiService } from "./ai.service"

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, AiOpenRouterClient, AiRepository],
  exports: [AiService],
})
export class AiModule {}
