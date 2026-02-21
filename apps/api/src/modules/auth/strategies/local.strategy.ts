import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local"

import { AuthService } from "../auth.service"

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
    })
  }

  validate(
    email: string,
    password: string
  ): {
    id: string
    email: string
    tenantId: string
    roles: string[]
    genderScope: "male" | "female" | "all"
  } {
    const user = this.authService.validateUserCredentials(email, password)
    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    return {
      id: user.sub,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    }
  }
}
