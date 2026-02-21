import { Body, Controller, HttpCode, Post } from "@nestjs/common"

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
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload)
  }

  @Post("register")
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload)
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload)
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() payload?: LogoutDto) {
    return this.authService.logout(payload)
  }
}
