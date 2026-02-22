import { Global, Module } from "@nestjs/common"

import { PermifyPdpService } from "./permify-pdp.service"

@Global()
@Module({
  providers: [PermifyPdpService],
  exports: [PermifyPdpService],
})
export class PermifyModule {}
