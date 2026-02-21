export type TenantStatus = "active" | "inactive" | "suspended"
export type BillingPlan = "free" | "basic" | "pro" | "enterprise"

export type TenantView = {
  id: string
  name: string
  slug: string
  genderPolicy: "boys_only" | "girls_only" | "mixed"
  status: TenantStatus
  billingPlan: BillingPlan
  studentLimit: number
  adminLimit: number
  monthlyPrice: number
  currency: string
  studentsCount?: number
  teachersCount?: number
  revenueTotal?: number
  createdAt: Date
  updatedAt: Date
  deactivatedAt: Date | null
}

export type PlanDetails = {
  studentLimit: number
  adminLimit: number
  monthlyPrice: number
  currency: string
}

export type TenantStatsView = {
  tenantId: string
  status: TenantStatus
  studentsCount: number
  teachersCount: number
  studentCapacityUsagePercent: number
  monthlyRevenue: number
  totalRevenue: number
}

export type TenantBillingView = {
  tenantId: string
  billingPlan: BillingPlan
  monthlyPrice: number
  currency: string
  studentLimit: number
  adminLimit: number
  status: TenantStatus
}
