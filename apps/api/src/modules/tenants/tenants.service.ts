import { db, payments, students, teachers, tenants } from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { ListTenantsQueryDto } from "./dto/list-tenants-query.dto"
import { UpdateTenantBillingDto } from "./dto/update-tenant-billing.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"

type TenantStatus = "active" | "inactive" | "suspended"
type BillingPlan = "free" | "basic" | "pro" | "enterprise"

type TenantView = {
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

@Injectable()
export class TenantsService {
  async list(query: ListTenantsQueryDto): Promise<{
    data: TenantView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [isNull(tenants.deletedAt)]

    if (query.status) {
      filters.push(eq(tenants.status, query.status))
    }
    if (query.billingPlan) {
      filters.push(eq(tenants.plan, query.billingPlan))
    }
    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        filters.push(or(ilike(tenants.name, `%${search}%`), ilike(tenants.slug, `%${search}%`))!)
      }
    }

    const whereExpr = and(...filters)
    const sortColumn = this.resolveSortColumn(query.sort)
    const orderExpr = query.order === "asc" ? asc(sortColumn) : desc(sortColumn)

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(tenants)
      .where(whereExpr)
    const total = totalRows[0]?.total ?? 0

    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select()
      .from(tenants)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => this.toTenantView(row)),
      meta: {
        page,
        limit: query.limit,
        total,
        totalPages,
      },
    }
  }

  async getById(id: string): Promise<TenantView> {
    const row = await this.findTenantOrThrow(id)
    return this.toTenantView(row)
  }

  async create(payload: CreateTenantDto): Promise<TenantView> {
    await this.assertUniqueSlug(payload.slug)

    const plan = payload.billingPlan ?? "free"
    const [created] = await db
      .insert(tenants)
      .values({
        name: payload.name,
        slug: payload.slug,
        genderPolicy: payload.genderPolicy,
        status: "active",
        plan,
      })
      .returning()

    if (!created) {
      throw new BadRequestException("Failed to create tenant")
    }

    return this.toTenantView(created)
  }

  async update(id: string, payload: UpdateTenantDto): Promise<TenantView> {
    await this.findTenantOrThrow(id)

    if (payload.slug) {
      await this.assertUniqueSlug(payload.slug, id)
    }

    const updatePayload: Partial<typeof tenants.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (payload.name) {
      updatePayload.name = payload.name
    }
    if (payload.slug) {
      updatePayload.slug = payload.slug
    }
    if (payload.genderPolicy) {
      updatePayload.genderPolicy = payload.genderPolicy
    }
    if (payload.status) {
      updatePayload.status = payload.status
      updatePayload.deletedAt = payload.status === "inactive" ? new Date() : null
    }
    if (payload.billingPlan) {
      updatePayload.plan = payload.billingPlan
    }

    const [updated] = await db
      .update(tenants)
      .set(updatePayload)
      .where(eq(tenants.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException("Tenant not found")
    }

    return this.toTenantView(updated)
  }

  async delete(id: string): Promise<{ success: true }> {
    await this.findTenantOrThrow(id)

    await db
      .update(tenants)
      .set({
        status: "inactive",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))

    return { success: true }
  }

  async activate(id: string): Promise<TenantView> {
    await this.findTenantOrThrow(id)
    const [updated] = await db
      .update(tenants)
      .set({
        status: "active",
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException("Tenant not found")
    }
    return this.toTenantView(updated)
  }

  async deactivate(id: string): Promise<TenantView> {
    await this.findTenantOrThrow(id)
    const [updated] = await db
      .update(tenants)
      .set({
        status: "inactive",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException("Tenant not found")
    }
    return this.toTenantView(updated)
  }

  async getStats(id: string): Promise<{
    tenantId: string
    status: TenantStatus
    studentsCount: number
    teachersCount: number
    studentCapacityUsagePercent: number
    monthlyRevenue: number
    totalRevenue: number
  }> {
    const row = await this.findTenantOrThrow(id)
    const planDetails = this.planDetails(row.plan)

    const studentCountRows = await db
      .select({ studentsCount: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.tenantId, id), isNull(students.deletedAt)))
    const studentsCount = studentCountRows[0]?.studentsCount ?? 0

    const teacherCountRows = await db
      .select({ teachersCount: sql<number>`count(*)::int` })
      .from(teachers)
      .where(and(eq(teachers.tenantId, id), isNull(teachers.deletedAt)))
    const teachersCount = teacherCountRows[0]?.teachersCount ?? 0

    const monthlyRevenueRows = await db
      .select({ monthlyRevenueRaw: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.tenantId, id),
          eq(payments.status, "paid"),
          isNull(payments.deletedAt),
          sql`date_trunc('month', ${payments.date}) = date_trunc('month', CURRENT_DATE)`
        )
      )
    const monthlyRevenueRaw = monthlyRevenueRows[0]?.monthlyRevenueRaw ?? "0"

    const totalRevenueRows = await db
      .select({ totalRevenueRaw: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(eq(payments.tenantId, id), eq(payments.status, "paid"), isNull(payments.deletedAt))
      )
    const totalRevenueRaw = totalRevenueRows[0]?.totalRevenueRaw ?? "0"

    const studentCapacityUsagePercent =
      planDetails.studentLimit > 0
        ? Math.round((studentsCount / planDetails.studentLimit) * 100)
        : 0

    return {
      tenantId: row.id,
      status: row.status,
      studentsCount,
      teachersCount,
      studentCapacityUsagePercent,
      monthlyRevenue: Number(monthlyRevenueRaw),
      totalRevenue: Number(totalRevenueRaw),
    }
  }

  async getBilling(id: string): Promise<{
    tenantId: string
    billingPlan: BillingPlan
    monthlyPrice: number
    currency: string
    studentLimit: number
    adminLimit: number
    status: TenantStatus
  }> {
    const row = await this.findTenantOrThrow(id)
    const planDetails = this.planDetails(row.plan)

    return {
      tenantId: row.id,
      billingPlan: row.plan,
      monthlyPrice: planDetails.monthlyPrice,
      currency: planDetails.currency,
      studentLimit: planDetails.studentLimit,
      adminLimit: planDetails.adminLimit,
      status: row.status,
    }
  }

  async updateBilling(
    id: string,
    payload: UpdateTenantBillingDto
  ): Promise<{
    tenantId: string
    billingPlan: BillingPlan
    monthlyPrice: number
    currency: string
    studentLimit: number
    adminLimit: number
    status: TenantStatus
  }> {
    await this.findTenantOrThrow(id)

    if (
      typeof payload.studentLimit === "number" ||
      typeof payload.adminLimit === "number" ||
      typeof payload.monthlyPrice === "number" ||
      payload.currency
    ) {
      throw new BadRequestException(
        "Custom limits/pricing is not persisted yet. Update billingPlan only."
      )
    }

    if (payload.billingPlan) {
      await db
        .update(tenants)
        .set({
          plan: payload.billingPlan,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, id))
    }

    return this.getBilling(id)
  }

  private async findTenantOrThrow(id: string): Promise<typeof tenants.$inferSelect> {
    const [row] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .limit(1)

    if (!row) {
      throw new NotFoundException("Tenant not found")
    }
    return row
  }

  private async assertUniqueSlug(slug: string, ignoreTenantId?: string): Promise<void> {
    const baseFilter: SQL[] = [eq(tenants.slug, slug), isNull(tenants.deletedAt)]
    if (ignoreTenantId) {
      baseFilter.push(ne(tenants.id, ignoreTenantId))
    }

    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(...baseFilter))
      .limit(1)

    if (existing) {
      throw new BadRequestException("Tenant slug already exists")
    }
  }

  private resolveSortColumn(sort: string | undefined) {
    switch (sort) {
      case "name":
        return tenants.name
      case "slug":
        return tenants.slug
      case "status":
        return tenants.status
      case "plan":
        return tenants.plan
      case "updatedAt":
        return tenants.updatedAt
      case "createdAt":
      default:
        return tenants.createdAt
    }
  }

  private planDetails(plan: BillingPlan): {
    studentLimit: number
    adminLimit: number
    monthlyPrice: number
    currency: string
  } {
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

  private toTenantView(row: typeof tenants.$inferSelect): TenantView {
    const planDetails = this.planDetails(row.plan as BillingPlan)
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      genderPolicy: row.genderPolicy,
      status: row.status,
      billingPlan: row.plan,
      studentLimit: planDetails.studentLimit,
      adminLimit: planDetails.adminLimit,
      monthlyPrice: planDetails.monthlyPrice,
      currency: planDetails.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deactivatedAt: row.deletedAt,
    }
  }
}
