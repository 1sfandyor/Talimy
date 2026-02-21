import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"

import { getAuthConfig } from "@/config/auth.config"

type RefreshPayload = {
  sub?: string
  email?: string
  tenantId?: string
  roles?: string[]
  genderScope?: "male" | "female" | "all"
  type?: "access" | "refresh"
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor() {
    const authConfig = getAuthConfig()
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtRefreshSecret,
    })
  }

  validate(payload: RefreshPayload): {
    id: string
    email: string
    tenantId: string
    roles: string[]
    genderScope: "male" | "female" | "all"
  } {
    if (
      payload.type !== "refresh" ||
      !payload.sub ||
      !payload.email ||
      !payload.tenantId ||
      !payload.genderScope
    ) {
      throw new UnauthorizedException("Invalid refresh token payload")
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles ?? [],
      genderScope: payload.genderScope,
    }
  }
}
