import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { Injectable, UnauthorizedException } from "@nestjs/common"

import { getAuthConfig } from "@/config/auth.config"

import type { AuthIdentity, AuthSession, TokenPayload } from "./auth.types"

@Injectable()
export class AuthTokenService {
  private readonly cfg = getAuthConfig()

  createSession(identity: AuthIdentity): AuthSession {
    return {
      accessToken: this.signToken(identity, "access"),
      refreshToken: this.signToken(identity, "refresh"),
      expiresIn: this.cfg.accessTokenTtlSec,
    }
  }

  verifyAccessToken(token: string): AuthIdentity {
    return this.toIdentity(this.verifyToken(token, "access"))
  }

  verifyRefreshToken(token: string): AuthIdentity {
    return this.toIdentity(this.verifyToken(token, "refresh"))
  }

  verifyRefreshTokenPayload(token: string): TokenPayload {
    return this.verifyToken(token, "refresh")
  }

  private toIdentity(payload: TokenPayload): AuthIdentity {
    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      genderScope: payload.genderScope,
    }
  }

  private signToken(identity: AuthIdentity, type: "access" | "refresh"): string {
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
    if (parts.length !== 3) throw new UnauthorizedException("Malformed token")

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
    if (payload.type !== expectedType) throw new UnauthorizedException("Invalid token type")
    if (!payload.exp || payload.exp < now) throw new UnauthorizedException("Token expired")
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

  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
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
