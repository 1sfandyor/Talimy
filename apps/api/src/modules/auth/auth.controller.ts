import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import { loginSchema, logoutSchema, refreshTokenSchema, registerSchema } from "@talimy/shared"

import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { LogoutDto } from "./dto/logout.dto"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { RegisterDto } from "./dto/register.dto"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) payload: unknown) {
    return this.authService.login(payload as LoginDto)
  }

  @Post("register")
  async register(@Body(new ZodValidationPipe(registerSchema)) payload: unknown) {
    return this.authService.register(payload as RegisterDto)
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) payload: unknown) {
    return this.authService.refresh(payload as RefreshTokenDto)
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Body(new ZodValidationPipe(logoutSchema)) payload?: unknown) {
    return this.authService.logout(payload as LogoutDto | undefined)
  }
}
