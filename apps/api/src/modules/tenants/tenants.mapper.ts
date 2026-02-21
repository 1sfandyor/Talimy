import type { tenants } from "@talimy/database"

import type { BillingPlan, PlanDetails, TenantView } from "./tenants.types"

export function planDetails(plan: BillingPlan): PlanDetails {
  switch (plan) {
    case "free":
      return { studentLimit: 50, adminLimit: 5, monthlyPrice: 0, currency: "USD" }
    case "basic":
      return { studentLimit: 200, adminLimit: 20, monthlyPrice: 50, currency: "USD" }
    case "pro":
      return { studentLimit: 1000, adminLimit: 200, monthlyPrice: 150, currency: "USD" }
    case "enterprise":
      return { studentLimit: 10000, adminLimit: 1000, monthlyPrice: 400, currency: "USD" }
    default:
      return { studentLimit: 50, adminLimit: 5, monthlyPrice: 0, currency: "USD" }
  }
}

export function toTenantView(row: typeof tenants.$inferSelect): TenantView {
  const details = planDetails(row.plan as BillingPlan)
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    genderPolicy: row.genderPolicy,
    status: row.status,
    billingPlan: row.plan,
    studentLimit: details.studentLimit,
    adminLimit: details.adminLimit,
    monthlyPrice: details.monthlyPrice,
    currency: details.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deactivatedAt: row.deletedAt,
  }
}
