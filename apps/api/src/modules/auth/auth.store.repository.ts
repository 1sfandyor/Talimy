import { db, users } from "@talimy/database"
import { and, eq, isNull } from "drizzle-orm"
import { Injectable } from "@nestjs/common"

import type { StoredUser } from "./auth.types"

@Injectable()
export class AuthStoreRepository {
  private readonly revokedRefreshTokenJti = new Set<string>()

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const normalizedEmail = this.normalizeEmail(email)
    const [row] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        tenantId: users.tenantId,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      tenantId: row.tenantId,
      passwordHash: row.passwordHash,
      roles: [row.role],
      // Gender scope is not persisted on users table yet; keep current default behavior.
      genderScope: "all",
    }
  }

  async hasUserByEmail(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email)
    return user !== null
  }

  async saveUser(user: StoredUser): Promise<void> {
    const [firstName, ...rest] = user.fullName.trim().split(/\s+/)
    const lastName = rest.join(" ") || "-"

    await db.insert(users).values({
      id: user.id,
      tenantId: user.tenantId,
      email: this.normalizeEmail(user.email),
      passwordHash: user.passwordHash,
      firstName: firstName || user.fullName,
      lastName,
      role: (user.roles[0] ?? "school_admin") as
        | "platform_admin"
        | "school_admin"
        | "teacher"
        | "student"
        | "parent",
      isActive: true,
    })
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
