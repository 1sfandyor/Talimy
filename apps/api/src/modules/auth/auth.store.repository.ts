import { Injectable } from "@nestjs/common"

import type { StoredUser } from "./auth.types"

@Injectable()
export class AuthStoreRepository {
  private readonly usersByEmail = new Map<string, StoredUser>()
  private readonly revokedRefreshTokenJti = new Set<string>()

  getUserByEmail(email: string): StoredUser | null {
    return this.usersByEmail.get(this.normalizeEmail(email)) ?? null
  }

  hasUserByEmail(email: string): boolean {
    return this.usersByEmail.has(this.normalizeEmail(email))
  }

  saveUser(user: StoredUser): void {
    this.usersByEmail.set(this.normalizeEmail(user.email), user)
  }

  revokeRefreshJti(jti: string): void {
    this.revokedRefreshTokenJti.add(jti)
  }

  isRefreshJtiRevoked(jti: string): boolean {
    return this.revokedRefreshTokenJti.has(jti)
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase()
  }
}
