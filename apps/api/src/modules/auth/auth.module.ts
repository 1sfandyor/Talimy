import { Module } from "@nestjs/common"
import { PassportModule } from "@nestjs/passport"

import { AuthController } from "./auth.controller"
import { AuthStoreRepository } from "./auth.store.repository"
import { AuthService } from "./auth.service"
import { AuthTokenService } from "./auth.token.service"
import { JwtStrategy } from "./strategies/jwt.strategy"
import { LocalStrategy } from "./strategies/local.strategy"
import { RefreshTokenStrategy } from "./strategies/refresh-token.strategy"

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthStoreRepository,
    AuthTokenService,
    JwtStrategy,
    LocalStrategy,
    RefreshTokenStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
