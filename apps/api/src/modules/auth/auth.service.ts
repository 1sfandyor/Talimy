import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import bcrypt from "bcrypt"

import { Injectable, UnauthorizedException } from "@nestjs/common"

import { getAuthConfig } from "@/config/auth.config"

import { LoginDto } from "./dto/login.dto"
import { LogoutDto } from "./dto/logout.dto"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { RegisterDto } from "./dto/register.dto"

type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

type TokenPayload = {
  sub: string
  email: string
  tenantId: string
  roles: string[]
  genderScope: "male" | "female" | "all"
  type: "access" | "refresh"
  jti: string
  iat: number
  exp: number
}

type StoredUser = {
  id: string
  fullName: string
  email: string
  tenantId: string
  passwordHash: string
  roles: string[]
  genderScope: "male" | "female" | "all"
}

type AuthIdentity = Omit<TokenPayload, "iat" | "exp" | "jti" | "type">

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12
  private readonly cfg = getAuthConfig()
  private readonly usersByEmail = new Map<string, StoredUser>()
  private readonly revokedRefreshTokenJti = new Set<string>()

  login(payload: LoginDto): AuthSession {
    const identity = this.validateUserCredentials(payload.email, payload.password)
    if (!identity) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const accessToken = this.signToken(
      {
        sub: identity.sub,
        email: identity.email,
        tenantId: identity.tenantId,
        roles: identity.roles,
        genderScope: identity.genderScope,
      },
      "access"
    )
    const refreshToken = this.signToken(
      {
        sub: identity.sub,
        email: identity.email,
        tenantId: identity.tenantId,
        roles: identity.roles,
        genderScope: identity.genderScope,
      },
      "refresh"
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.cfg.accessTokenTtlSec,
    }
  }

  register(payload: RegisterDto): AuthSession {
    const normalizedEmail = payload.email.toLowerCase()
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new UnauthorizedException("Email already exists")
    }

    const user: StoredUser = {
      id: randomUUID(),
      fullName: payload.fullName,
      email: normalizedEmail,
      tenantId: payload.tenantId,
      passwordHash: this.hashPassword(payload.password),
      roles: ["school_admin"],
      genderScope: "all",
    }
    this.usersByEmail.set(normalizedEmail, user)

    const accessToken = this.signToken(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        genderScope: user.genderScope,
      },
      "access"
    )
    const refreshToken = this.signToken(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        genderScope: user.genderScope,
      },
      "refresh"
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.cfg.accessTokenTtlSec,
    }
  }

  refresh(payload: RefreshTokenDto): AuthSession {
    const tokenPayload = this.verifyToken(payload.refreshToken, "refresh")
    if (this.revokedRefreshTokenJti.has(tokenPayload.jti)) {
      throw new UnauthorizedException("Refresh token has been revoked")
    }

    const user = this.usersByEmail.get(tokenPayload.email)
    if (!user) {
      throw new UnauthorizedException("User not found for refresh token")
    }

    this.revokedRefreshTokenJti.add(tokenPayload.jti)
    const accessToken = this.signToken(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        genderScope: user.genderScope,
      },
      "access"
    )
    const refreshToken = this.signToken(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        genderScope: user.genderScope,
      },
      "refresh"
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.cfg.accessTokenTtlSec,
    }
  }

  logout(payload?: LogoutDto): { success: true } {
    if (payload?.refreshToken) {
      const tokenPayload = this.verifyToken(payload.refreshToken, "refresh")
      this.revokedRefreshTokenJti.add(tokenPayload.jti)
    }
    return { success: true }
  }

  verifyAccessToken(token: string): AuthIdentity {
    const payload = this.verifyToken(token, "access")
    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      genderScope: payload.genderScope,
    }
  }

  verifyRefreshToken(token: string): AuthIdentity {
    const payload = this.verifyToken(token, "refresh")
    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      genderScope: payload.genderScope,
    }
  }

  validateUserCredentials(email: string, password: string): AuthIdentity | null {
    const user = this.usersByEmail.get(email.toLowerCase())
    if (!user) {
      return null
    }
    const validPassword = this.verifyPassword(password, user.passwordHash)
    if (!validPassword) {
      return null
    }
    return {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      genderScope: user.genderScope,
    }
  }

  private signToken(
    identity: Omit<TokenPayload, "type" | "iat" | "exp" | "jti">,
    type: "access" | "refresh"
  ): string {
    const now = Math.floor(Date.now() / 1000)
    const ttl = type === "access" ? this.cfg.accessTokenTtlSec : this.cfg.refreshTokenTtlSec
    const payload: TokenPayload = {
      ...identity,
      type,
      jti: randomUUID(),
      iat: now,
      exp: now + ttl,
    }

    const header = { alg: "HS256", typ: "JWT" }
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const body = `${encodedHeader}.${encodedPayload}`
    const secret = type === "access" ? this.cfg.jwtAccessSecret : this.cfg.jwtRefreshSecret
    const signature = this.base64UrlFromBuffer(createHmac("sha256", secret).update(body).digest())
    return `${body}.${signature}`
  }

  private verifyToken(token: string, expectedType: "access" | "refresh"): TokenPayload {
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new UnauthorizedException("Malformed token")
    }

    const [encodedHeader, encodedPayload, signature] = parts
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Malformed token")
    }
    const body = `${encodedHeader}.${encodedPayload}`
    const secret = expectedType === "access" ? this.cfg.jwtAccessSecret : this.cfg.jwtRefreshSecret
    const expectedSignature = this.base64UrlFromBuffer(
      createHmac("sha256", secret).update(body).digest()
    )
    if (!this.safeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException("Invalid token signature")
    }

    const payloadRaw = this.base64UrlDecode(encodedPayload)
    const payload = JSON.parse(payloadRaw) as Partial<TokenPayload>
    const now = Math.floor(Date.now() / 1000)
    if (payload.type !== expectedType) {
      throw new UnauthorizedException("Invalid token type")
    }
    if (!payload.exp || payload.exp < now) {
      throw new UnauthorizedException("Token expired")
    }
    if (
      !payload.sub ||
      !payload.email ||
      !payload.tenantId ||
      !payload.roles ||
      !payload.genderScope ||
      !payload.jti ||
      !payload.iat ||
      !payload.exp
    ) {
      throw new UnauthorizedException("Invalid token payload")
    }

    return payload as TokenPayload
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, AuthService.BCRYPT_ROUNDS)
  }

  private verifyPassword(password: string, stored: string): boolean {
    return bcrypt.compareSync(password, stored)
  }

  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) {
      return false
    }
    return timingSafeEqual(bufA, bufB)
  }

  private base64UrlEncode(input: string): string {
    return this.base64UrlFromBuffer(Buffer.from(input, "utf-8"))
  }

  private base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf-8")
  }

  private base64UrlFromBuffer(input: Buffer): string {
    return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }
}
