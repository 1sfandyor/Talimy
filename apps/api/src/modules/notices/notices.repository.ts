import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { db, notices } from "@talimy/database"
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm"

import { CreateNoticeDto, UpdateNoticeDto } from "./dto/create-notice.dto"
import { NoticeQueryDto } from "./dto/notice-query.dto"
import type {
  NoticeAudienceRole,
  NoticeListResponse,
  NoticePriority,
  NoticeTargetRole,
  NoticeView,
} from "./notices.types"

@Injectable()
export class NoticesRepository {
  async list(query: NoticeQueryDto): Promise<NoticeListResponse> {
    const filters = this.buildFilters(query)

    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notices)
      .where(and(...filters))

    const total = totalRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / query.limit))
    const page = Math.min(query.page, totalPages)
    const offset = (page - 1) * query.limit

    const orderBy = this.resolveOrderBy(query.sort, query.order)

    const rows = await db
      .select({
        id: notices.id,
        tenantId: notices.tenantId,
        title: notices.title,
        content: notices.content,
        targetRole: notices.targetRole,
        priority: notices.priority,
        createdBy: notices.createdBy,
        publishDate: notices.publishDate,
        expiryDate: notices.expiryDate,
        createdAt: notices.createdAt,
        updatedAt: notices.updatedAt,
      })
      .from(notices)
      .where(and(...filters))
      .orderBy(...orderBy)
      .limit(query.limit)
      .offset(offset)

    return {
      data: rows.map((row) => this.mapNoticeRow(row)),
      meta: { page, limit: query.limit, total, totalPages },
    }
  }

  async getById(tenantId: string, id: string): Promise<NoticeView> {
    const row = await this.findNoticeOrThrow(tenantId, id)
    return this.mapNoticeRow(row)
  }

  async create(payload: CreateNoticeDto, createdBy?: string): Promise<NoticeView> {
    const publishDate = payload.publishDate ? new Date(payload.publishDate) : undefined
    const expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : undefined
    this.assertDateRange(publishDate ?? new Date(), expiryDate ?? null)

    const [created] = await db
      .insert(notices)
      .values({
        tenantId: payload.tenantId,
        title: payload.title,
        content: payload.content,
        targetRole: payload.targetRole,
        priority: payload.priority ?? "medium",
        createdBy: createdBy ?? null,
        publishDate,
        expiryDate,
      })
      .returning()

    if (!created) {
      throw new BadRequestException("Failed to create notice")
    }

    return this.mapNoticeRow(created)
  }

  async update(tenantId: string, id: string, payload: UpdateNoticeDto): Promise<NoticeView> {
    const current = await this.findNoticeOrThrow(tenantId, id)

    const nextPublishDate = payload.publishDate ? new Date(payload.publishDate) : current.publishDate
    const nextExpiryDate =
      payload.expiryDate === null ? null : payload.expiryDate ? new Date(payload.expiryDate) : current.expiryDate

    this.assertDateRange(nextPublishDate, nextExpiryDate)

    await db
      .update(notices)
      .set({
        title: payload.title ?? current.title,
        content: payload.content ?? current.content,
        targetRole: payload.targetRole ?? (current.targetRole as NoticeTargetRole),
        priority: payload.priority ?? (current.priority as NoticePriority),
        publishDate: nextPublishDate,
        expiryDate: nextExpiryDate,
        updatedAt: new Date(),
      })
      .where(and(eq(notices.id, id), eq(notices.tenantId, tenantId), isNull(notices.deletedAt)))

    return this.getById(tenantId, id)
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findNoticeOrThrow(tenantId, id)

    await db
      .update(notices)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notices.id, id), eq(notices.tenantId, tenantId), isNull(notices.deletedAt)))

    return { success: true }
  }

  private buildFilters(query: NoticeQueryDto): SQL[] {
    const filters: SQL[] = [eq(notices.tenantId, query.tenantId), isNull(notices.deletedAt)]

    if (query.targetRole) {
      filters.push(eq(notices.targetRole, query.targetRole))
    }

    if (query.priority) {
      filters.push(eq(notices.priority, query.priority))
    }

    if (query.role) {
      filters.push(inArray(notices.targetRole, ["all", query.role]))
    }

    if (query.search?.trim()) {
      const search = query.search.trim()
      filters.push(or(ilike(notices.title, `%${search}%`), ilike(notices.content, `%${search}%`))!)
    }

    return filters
  }

  private resolveOrderBy(sort: string | undefined, order: "asc" | "desc") {
    const direction = order === "asc" ? asc : desc

    switch (sort) {
      case "title":
        return [direction(notices.title), desc(notices.updatedAt), desc(notices.createdAt)] as const
      case "updatedAt":
        return [direction(notices.updatedAt), desc(notices.createdAt)] as const
      case "createdAt":
        return [direction(notices.createdAt)] as const
      case "publishDate":
      default:
        return [direction(notices.publishDate), desc(notices.createdAt)] as const
    }
  }

  private mapNoticeRow(row: {
    id: string
    tenantId: string
    title: string
    content: string
    targetRole: string
    priority: string
    createdBy: string | null
    publishDate: Date
    expiryDate: Date | null
    createdAt: Date
    updatedAt: Date
  }): NoticeView {
    return {
      id: row.id,
      tenantId: row.tenantId,
      title: row.title,
      content: row.content,
      targetRole: row.targetRole as NoticeTargetRole,
      priority: row.priority as NoticePriority,
      createdBy: row.createdBy,
      publishDate: row.publishDate.toISOString(),
      expiryDate: row.expiryDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private async findNoticeOrThrow(tenantId: string, id: string) {
    const [row] = await db
      .select({
        id: notices.id,
        tenantId: notices.tenantId,
        title: notices.title,
        content: notices.content,
        targetRole: notices.targetRole,
        priority: notices.priority,
        createdBy: notices.createdBy,
        publishDate: notices.publishDate,
        expiryDate: notices.expiryDate,
        createdAt: notices.createdAt,
        updatedAt: notices.updatedAt,
      })
      .from(notices)
      .where(and(eq(notices.id, id), eq(notices.tenantId, tenantId), isNull(notices.deletedAt)))
      .limit(1)

    if (!row) {
      throw new NotFoundException("Notice not found")
    }

    return row
  }

  private assertDateRange(publishDate: Date, expiryDate: Date | null): void {
    if (Number.isNaN(publishDate.getTime())) {
      throw new BadRequestException("Invalid publishDate")
    }

    if (!expiryDate) {
      return
    }

    if (Number.isNaN(expiryDate.getTime())) {
      throw new BadRequestException("Invalid expiryDate")
    }

    if (expiryDate.getTime() < publishDate.getTime()) {
      throw new BadRequestException("expiryDate must be greater than or equal to publishDate")
    }
  }
}

