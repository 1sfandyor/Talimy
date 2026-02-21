import { randomUUID } from "node:crypto"

import bcrypt from "bcrypt"

import { Injectable, UnauthorizedException } from "@nestjs/common"

import { LoginDto } from "./dto/login.dto"
import { LogoutDto } from "./dto/logout.dto"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { RegisterDto } from "./dto/register.dto"
import { AuthStoreRepository } from "./auth.store.repository"
import { AuthTokenService } from "./auth.token.service"
import type { AuthIdentity, AuthSession, StoredUser } from "./auth.types"

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12

  constructor(
    private readonly store: AuthStoreRepository,
    private readonly tokenService: AuthTokenService
  ) {}

  login(payload: LoginDto): AuthSession {
    const identity = this.validateUserCredentials(payload.email, payload.password)
    if (!identity) throw new UnauthorizedException("Invalid credentials")
    return this.tokenService.createSession(identity)
  }

  register(payload: RegisterDto): AuthSession {
    const normalizedEmail = payload.email.toLowerCase()
    if (this.store.hasUserByEmail(normalizedEmail)) {
      throw new UnauthorizedException("Email already exists")
    }

    const user: StoredUser = {
      id: randomUUID(),
      fullName: payload.fullName,
      email: normalizedEmail,
      tenantId: payload.tenantId,
      passwordHash: bcrypt.hashSync(payload.password, AuthService.BCRYPT_ROUNDS),
      roles: ["school_admin"],
      genderScope: "all",
    }
    this.store.saveUser(user)

    return this.tokenService.createSession({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    })
  }

  refresh(payload: RefreshTokenDto): AuthSession {
    const tokenPayload = this.tokenService.verifyRefreshTokenPayload(payload.refreshToken)
    if (this.store.isRefreshJtiRevoked(tokenPayload.jti)) {
      throw new UnauthorizedException("Refresh token has been revoked")
    }

    const user = this.store.getUserByEmail(tokenPayload.email)
    if (!user) {
      throw new UnauthorizedException("User not found for refresh token")
    }

    this.store.revokeRefreshJti(tokenPayload.jti)
    return this.tokenService.createSession({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    })
  }

  logout(payload?: LogoutDto): { success: true } {
    if (payload?.refreshToken) {
      const tokenPayload = this.tokenService.verifyRefreshTokenPayload(payload.refreshToken)
      this.store.revokeRefreshJti(tokenPayload.jti)
    }
    return { success: true }
  }

  verifyAccessToken(token: string): AuthIdentity {
    return this.tokenService.verifyAccessToken(token)
  }

  verifyRefreshToken(token: string): AuthIdentity {
    return this.tokenService.verifyRefreshToken(token)
  }

  validateUserCredentials(email: string, password: string): AuthIdentity | null {
    const user = this.store.getUserByEmail(email)
    if (!user) return null
    const validPassword = bcrypt.compareSync(password, user.passwordHash)
    if (!validPassword) return null

    return {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    }
  }
}
