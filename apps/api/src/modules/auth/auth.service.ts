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

  async login(payload: LoginDto): Promise<AuthSession> {
    const identity = await this.validateUserCredentials(payload.email, payload.password)
    if (!identity) throw new UnauthorizedException("Invalid credentials")
    return this.tokenService.createSession(identity)
  }

  async register(payload: RegisterDto): Promise<AuthSession> {
    const normalizedEmail = payload.email.toLowerCase()
    if (await this.store.hasUserByEmail(normalizedEmail)) {
      throw new UnauthorizedException("Email already exists")
    }

    const role = payload.role ?? "school_admin"
    if (role === "platform_admin") {
      const expectedBootstrapKey = process.env.AUTH_PLATFORM_ADMIN_BOOTSTRAP_KEY
      if (!expectedBootstrapKey || payload.bootstrapKey !== expectedBootstrapKey) {
        throw new UnauthorizedException("Platform admin registration is disabled")
      }
    }

    const user: StoredUser = {
      id: randomUUID(),
      fullName: payload.fullName,
      email: normalizedEmail,
      tenantId: payload.tenantId,
      passwordHash: bcrypt.hashSync(payload.password, AuthService.BCRYPT_ROUNDS),
      roles: [role],
      genderScope: "all",
    }
    await this.store.saveUser(user)

    return this.tokenService.createSession({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    })
  }

  async refresh(payload: RefreshTokenDto): Promise<AuthSession> {
    const tokenPayload = this.tokenService.verifyRefreshTokenPayload(payload.refreshToken)
    if (this.store.isRefreshJtiRevoked(tokenPayload.jti)) {
      throw new UnauthorizedException("Refresh token has been revoked")
    }

    const user = await this.store.getUserByEmail(tokenPayload.email)
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

  async validateUserCredentials(email: string, password: string): Promise<AuthIdentity | null> {
    const user = await this.store.getUserByEmail(email)
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
