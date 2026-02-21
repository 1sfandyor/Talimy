import type { parents, users } from "@talimy/database"

import type { ParentView } from "./parents.types"

export function toParentView(
  parent: typeof parents.$inferSelect,
  user: typeof users.$inferSelect
): ParentView {
  return {
    id: parent.id,
    tenantId: parent.tenantId,
    userId: parent.userId,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: parent.phone,
    occupation: parent.occupation,
    address: parent.address,
    relationship: parent.relationship,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  }
}
