import { Module } from "@nestjs/common"

import { PermifyPdpService } from "./permify-pdp.service"

@Module({
  providers: [PermifyPdpService],
  exports: [PermifyPdpService],
})
export class PermifyModule {}
