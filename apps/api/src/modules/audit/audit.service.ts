import { auditLogs, db } from "@talimy/database"
import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, gte, ilike, isNull, lte, sql, type SQL } from "drizzle-orm"

import type { AuditLogsQueryDto } from "./dto/audit-query.dto"

type AuditLogView = {
  id: string
  userId: string | null
  tenantId: string
  action: string
  resource: string
  resourceId: string | null
  oldData: unknown
  newData: unknown
  ipAddress: string | null
  timestamp: string
  createdAt: string
  updatedAt: string
}

type CreateAuditLogInput = {
  tenantId: string
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  oldData?: unknown
  newData?: unknown
  ipAddress?: string | null
}

@Injectable()
export class AuditService {
  async log(input: CreateAuditLogInput): Promise<void> {
    await db.insert(auditLogs).values({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      oldData: input.oldData ?? null,
      newData: input.newData ?? null,
      ipAddress: input.ipAddress ?? null,
      timestamp: new Date(),
    })
  }

  async list(query: AuditLogsQueryDto): Promise<{
    data: AuditLogView[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const filters = this.buildFilters(query)
    const whereExpr = and(...filters)

    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereExpr)

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereExpr)
      .orderBy(...this.resolveOrderBy(query.sort, query.order))
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  private buildFilters(query: AuditLogsQueryDto): SQL[] {
    const filters: SQL[] = [eq(auditLogs.tenantId, query.tenantId), isNull(auditLogs.deletedAt)]

    if (query.action) filters.push(eq(auditLogs.action, query.action))
    if (query.resource) filters.push(eq(auditLogs.resource, query.resource))
    if (query.userId) filters.push(eq(auditLogs.userId, query.userId))
    if (query.resourceId) filters.push(eq(auditLogs.resourceId, query.resourceId))
    if (query.from) filters.push(gte(auditLogs.timestamp, new Date(query.from)))
    if (query.to) filters.push(lte(auditLogs.timestamp, new Date(query.to)))
    if (query.search) {
      const search = `%${query.search.trim()}%`
      filters.push(ilike(auditLogs.action, search))
    }

    return filters
  }

  private resolveOrderBy(sort: AuditLogsQueryDto["sort"], order: AuditLogsQueryDto["order"]) {
    const direction = order === "asc" ? asc : desc
    switch (sort) {
      case "action":
        return [direction(auditLogs.action), desc(auditLogs.timestamp)] as const
      case "resource":
        return [direction(auditLogs.resource), desc(auditLogs.timestamp)] as const
      case "createdAt":
        return [direction(auditLogs.createdAt)] as const
      case "timestamp":
      default:
        return [direction(auditLogs.timestamp)] as const
    }
  }
}
