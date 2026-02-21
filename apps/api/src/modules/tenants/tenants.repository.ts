import { db, payments, students, teachers, tenants } from "@talimy/database"
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm"
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"

import { CreateTenantDto } from "./dto/create-tenant.dto"
import { ListTenantsQueryDto } from "./dto/list-tenants-query.dto"
import { UpdateTenantBillingDto } from "./dto/update-tenant-billing.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"
import { planDetails, toTenantView } from "./tenants.mapper"
import type { BillingPlan, TenantBillingView, TenantStatsView, TenantView } from "./tenants.types"

@Injectable()
export class TenantsRepository {
  async list(query: ListTenantsQueryDto): Promise<{
    data: TenantView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters: SQL[] = [isNull(tenants.deletedAt)]
    if (query.status) filters.push(eq(tenants.status, query.status))
    if (query.billingPlan) filters.push(eq(tenants.plan, query.billingPlan))
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
      data: rows.map(toTenantView),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(id: string): Promise<TenantView> {
    const row = await this.findTenantOrThrow(id)
    return toTenantView(row)
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
    if (!created) throw new BadRequestException("Failed to create tenant")
    return toTenantView(created)
  }

  async update(id: string, payload: UpdateTenantDto): Promise<TenantView> {
    await this.findTenantOrThrow(id)
    if (payload.slug) await this.assertUniqueSlug(payload.slug, id)

    const updatePayload: Partial<typeof tenants.$inferInsert> = { updatedAt: new Date() }
    if (payload.name) updatePayload.name = payload.name
    if (payload.slug) updatePayload.slug = payload.slug
    if (payload.genderPolicy) updatePayload.genderPolicy = payload.genderPolicy
    if (payload.status) {
      updatePayload.status = payload.status
      updatePayload.deletedAt = payload.status === "inactive" ? new Date() : null
    }
    if (payload.billingPlan) updatePayload.plan = payload.billingPlan

    const [updated] = await db
      .update(tenants)
      .set(updatePayload)
      .where(eq(tenants.id, id))
      .returning()
    if (!updated) throw new NotFoundException("Tenant not found")
    return toTenantView(updated)
  }

  async delete(id: string): Promise<{ success: true }> {
    await this.findTenantOrThrow(id)
    await db
      .update(tenants)
      .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tenants.id, id))
    return { success: true }
  }

  async activate(id: string): Promise<TenantView> {
    await this.findTenantOrThrow(id)
    const [updated] = await db
      .update(tenants)
      .set({ status: "active", deletedAt: null, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning()
    if (!updated) throw new NotFoundException("Tenant not found")
    return toTenantView(updated)
  }

  async deactivate(id: string): Promise<TenantView> {
    await this.findTenantOrThrow(id)
    const [updated] = await db
      .update(tenants)
      .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning()
    if (!updated) throw new NotFoundException("Tenant not found")
    return toTenantView(updated)
  }

  async getStats(id: string): Promise<TenantStatsView> {
    const row = await this.findTenantOrThrow(id)
    const details = planDetails(row.plan as BillingPlan)

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
      details.studentLimit > 0 ? Math.round((studentsCount / details.studentLimit) * 100) : 0

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

  async getBilling(id: string): Promise<TenantBillingView> {
    const row = await this.findTenantOrThrow(id)
    const details = planDetails(row.plan as BillingPlan)
    return {
      tenantId: row.id,
      billingPlan: row.plan,
      monthlyPrice: details.monthlyPrice,
      currency: details.currency,
      studentLimit: details.studentLimit,
      adminLimit: details.adminLimit,
      status: row.status,
    }
  }

  async updateBilling(id: string, payload: UpdateTenantBillingDto): Promise<TenantBillingView> {
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
        .set({ plan: payload.billingPlan, updatedAt: new Date() })
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
    if (!row) throw new NotFoundException("Tenant not found")
    return row
  }

  private async assertUniqueSlug(slug: string, ignoreTenantId?: string): Promise<void> {
    const baseFilter: SQL[] = [eq(tenants.slug, slug), isNull(tenants.deletedAt)]
    if (ignoreTenantId) baseFilter.push(ne(tenants.id, ignoreTenantId))

    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(...baseFilter))
      .limit(1)
    if (existing) throw new BadRequestException("Tenant slug already exists")
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
}
