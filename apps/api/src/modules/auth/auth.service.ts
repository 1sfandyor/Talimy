import { Injectable } from "@nestjs/common"

import { LoginDto } from "./dto/login.dto"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { RegisterDto } from "./dto/register.dto"

type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

@Injectable()
export class AuthService {
  login(payload: LoginDto): AuthSession {
    return {
      accessToken: `access_${payload.email}`,
      refreshToken: `refresh_${payload.email}`,
      expiresIn: 900,
    }
  }

  register(payload: RegisterDto): AuthSession {
    return {
      accessToken: `access_${payload.email}`,
      refreshToken: `refresh_${payload.email}`,
      expiresIn: 900,
    }
  }

  refresh(payload: RefreshTokenDto): AuthSession {
    return {
      accessToken: `rotated_${payload.refreshToken}`,
      refreshToken: payload.refreshToken,
      expiresIn: 900,
    }
  }

  logout(): { success: true } {
    return { success: true }
  }
}
