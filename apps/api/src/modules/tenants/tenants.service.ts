import { randomUUID } from "node:crypto"

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { ListTenantsQueryDto } from "./dto/list-tenants-query.dto"
import { UpdateTenantBillingDto } from "./dto/update-tenant-billing.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"

type TenantStatus = "active" | "inactive"
type BillingPlan = "free" | "basic" | "premium" | "enterprise"

type TenantRecord = {
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
  studentsCount: number
  teachersCount: number
  revenueTotal: number
  createdAt: Date
  updatedAt: Date
  deactivatedAt: Date | null
}

@Injectable()
export class TenantsService {
  private readonly tenants: TenantRecord[] = [
    {
      id: "tenant_demo_talimy_school",
      name: "Talimy Demo School",
      slug: "talimy-demo",
      genderPolicy: "mixed",
      status: "active",
      billingPlan: "basic",
      studentLimit: 500,
      adminLimit: 30,
      monthlyPrice: 50,
      currency: "USD",
      studentsCount: 120,
      teachersCount: 18,
      revenueTotal: 600,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      deactivatedAt: null,
    },
  ]

  list(query: ListTenantsQueryDto): {
    data: TenantRecord[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  } {
    const normalizedSearch = query.search?.trim().toLowerCase()

    let filtered = this.tenants.filter((tenant) => {
      if (query.status && tenant.status !== query.status) {
        return false
      }
      if (query.billingPlan && tenant.billingPlan !== query.billingPlan) {
        return false
      }
      if (
        normalizedSearch &&
        !tenant.name.toLowerCase().includes(normalizedSearch) &&
        !tenant.slug.toLowerCase().includes(normalizedSearch)
      ) {
        return false
      }
      return true
    })

    const sortField = query.sort ?? "createdAt"
    const orderFactor = query.order === "asc" ? 1 : -1
    filtered = [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * orderFactor
        case "slug":
          return a.slug.localeCompare(b.slug) * orderFactor
        case "studentsCount":
          return (a.studentsCount - b.studentsCount) * orderFactor
        case "monthlyPrice":
          return (a.monthlyPrice - b.monthlyPrice) * orderFactor
        case "createdAt":
        default:
          return (a.createdAt.getTime() - b.createdAt.getTime()) * orderFactor
      }
    })

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const start = (page - 1) * query.limit
    const data = filtered.slice(start, start + query.limit)

    return {
      data,
      meta: {
        page,
        limit: query.limit,
        total,
        totalPages,
      },
    }
  }

  getById(id: string): TenantRecord {
    const found = this.tenants.find((tenant) => tenant.id === id)
    if (!found) {
      throw new NotFoundException("Tenant not found")
    }
    return found
  }

  create(payload: CreateTenantDto): TenantRecord {
    this.assertUniqueSlug(payload.slug)

    const now = new Date()
    const billingPlan = payload.billingPlan ?? "free"
    const next: TenantRecord = {
      id: randomUUID(),
      name: payload.name,
      slug: payload.slug,
      genderPolicy: payload.genderPolicy,
      status: "active",
      billingPlan,
      studentLimit: payload.studentLimit ?? this.defaultStudentLimitByPlan(billingPlan),
      adminLimit: payload.adminLimit ?? this.defaultAdminLimitByPlan(billingPlan),
      monthlyPrice: payload.monthlyPrice ?? this.defaultPriceByPlan(billingPlan),
      currency: payload.currency ?? "USD",
      studentsCount: 0,
      teachersCount: 0,
      revenueTotal: 0,
      createdAt: now,
      updatedAt: now,
      deactivatedAt: null,
    }
    this.tenants.push(next)
    return next
  }

  update(id: string, payload: UpdateTenantDto): TenantRecord {
    const found = this.getById(id)
    if (payload.name) {
      found.name = payload.name
    }
    if (payload.slug) {
      this.assertUniqueSlug(payload.slug, id)
      found.slug = payload.slug
    }
    if (payload.genderPolicy) {
      found.genderPolicy = payload.genderPolicy
    }
    if (payload.status) {
      found.status = payload.status
      found.deactivatedAt = payload.status === "inactive" ? new Date() : null
    }
    if (payload.billingPlan) {
      found.billingPlan = payload.billingPlan
    }
    if (typeof payload.studentLimit === "number") {
      found.studentLimit = payload.studentLimit
    }
    if (typeof payload.adminLimit === "number") {
      found.adminLimit = payload.adminLimit
    }
    if (typeof payload.monthlyPrice === "number") {
      found.monthlyPrice = payload.monthlyPrice
    }
    if (payload.currency) {
      found.currency = payload.currency.toUpperCase()
    }
    found.updatedAt = new Date()
    return found
  }

  delete(id: string): { success: true } {
    const idx = this.tenants.findIndex((tenant) => tenant.id === id)
    if (idx < 0) {
      throw new NotFoundException("Tenant not found")
    }
    this.tenants.splice(idx, 1)
    return { success: true }
  }

  activate(id: string): TenantRecord {
    const found = this.getById(id)
    found.status = "active"
    found.deactivatedAt = null
    found.updatedAt = new Date()
    return found
  }

  deactivate(id: string): TenantRecord {
    const found = this.getById(id)
    found.status = "inactive"
    found.deactivatedAt = new Date()
    found.updatedAt = new Date()
    return found
  }

  getStats(id: string): {
    tenantId: string
    status: TenantStatus
    studentsCount: number
    teachersCount: number
    studentCapacityUsagePercent: number
    monthlyRevenue: number
    totalRevenue: number
  } {
    const found = this.getById(id)
    const studentCapacityUsagePercent =
      found.studentLimit > 0 ? Math.round((found.studentsCount / found.studentLimit) * 100) : 0
    return {
      tenantId: found.id,
      status: found.status,
      studentsCount: found.studentsCount,
      teachersCount: found.teachersCount,
      studentCapacityUsagePercent,
      monthlyRevenue: found.monthlyPrice,
      totalRevenue: found.revenueTotal,
    }
  }

  getBilling(id: string): {
    tenantId: string
    billingPlan: BillingPlan
    monthlyPrice: number
    currency: string
    studentLimit: number
    adminLimit: number
    status: TenantStatus
  } {
    const found = this.getById(id)
    return {
      tenantId: found.id,
      billingPlan: found.billingPlan,
      monthlyPrice: found.monthlyPrice,
      currency: found.currency,
      studentLimit: found.studentLimit,
      adminLimit: found.adminLimit,
      status: found.status,
    }
  }

  updateBilling(
    id: string,
    payload: UpdateTenantBillingDto
  ): {
    tenantId: string
    billingPlan: BillingPlan
    monthlyPrice: number
    currency: string
    studentLimit: number
    adminLimit: number
    status: TenantStatus
  } {
    const found = this.getById(id)

    if (payload.billingPlan) {
      found.billingPlan = payload.billingPlan
    }
    if (typeof payload.monthlyPrice === "number") {
      found.monthlyPrice = payload.monthlyPrice
    }
    if (typeof payload.studentLimit === "number") {
      if (payload.studentLimit < found.studentsCount) {
        throw new BadRequestException("studentLimit cannot be below current students count")
      }
      found.studentLimit = payload.studentLimit
    }
    if (typeof payload.adminLimit === "number") {
      found.adminLimit = payload.adminLimit
    }
    if (payload.currency) {
      found.currency = payload.currency.toUpperCase()
    }

    found.updatedAt = new Date()
    return this.getBilling(id)
  }

  private assertUniqueSlug(slug: string, ignoreTenantId?: string): void {
    const exists = this.tenants.some((tenant) => {
      if (ignoreTenantId && tenant.id === ignoreTenantId) {
        return false
      }
      return tenant.slug.toLowerCase() === slug.toLowerCase()
    })
    if (exists) {
      throw new BadRequestException("Tenant slug already exists")
    }
  }

  private defaultStudentLimitByPlan(plan: BillingPlan): number {
    switch (plan) {
      case "free":
        return 50
      case "basic":
        return 200
      case "premium":
        return 1000
      case "enterprise":
        return 10000
      default:
        return 50
    }
  }

  private defaultAdminLimitByPlan(plan: BillingPlan): number {
    switch (plan) {
      case "free":
        return 5
      case "basic":
        return 20
      case "premium":
        return 200
      case "enterprise":
        return 1000
      default:
        return 5
    }
  }

  private defaultPriceByPlan(plan: BillingPlan): number {
    switch (plan) {
      case "free":
        return 0
      case "basic":
        return 50
      case "premium":
        return 150
      case "enterprise":
        return 400
      default:
        return 0
    }
  }
}
