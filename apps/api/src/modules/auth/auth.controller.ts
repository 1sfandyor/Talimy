import { Body, Controller, HttpCode, Post, UsePipes } from "@nestjs/common"
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
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload)
  }

  @Post("register")
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload)
  }

  @Post("refresh")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload)
  }

  @Post("logout")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(logoutSchema))
  logout(@Body() payload?: LogoutDto) {
    return this.authService.logout(payload)
  }
}
