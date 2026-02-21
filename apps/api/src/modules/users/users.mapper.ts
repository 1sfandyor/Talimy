import type { users } from "@talimy/database"

import type { UserView } from "./users.types"

export function toUserView(row: typeof users.$inferSelect): UserView {
  const fullName = `${row.firstName} ${row.lastName}`.trim()
  return {
    id: row.id,
    tenantId: row.tenantId,
    fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLogin: row.lastLogin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim().replace(/\s+/g, " ")
  const parts = normalized.split(" ").filter((part) => part.length > 0)
  if (parts.length === 0) {
    return { firstName: "User", lastName: "Unknown" }
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "Unknown" }
  }
  const firstName = parts[0]!
  const lastName = parts.slice(1).join(" ")
  return { firstName, lastName }
}
