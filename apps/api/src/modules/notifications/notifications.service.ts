import { notifications, db, users } from "@talimy/database"
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common"

import type {
  MarkNotificationReadDto,
  NotificationChannel,
  NotificationScopeQueryDto,
  NotificationsQueryDto,
  NotificationType,
  SendNotificationDto,
} from "./dto/send-notification.dto"
import { NotificationsGateway } from "./notifications.gateway"

type ActorContext = {
  id: string
  tenantId?: string
  roles?: string[]
}

type NotificationListItem = {
  id: string
  userId: string
  tenantId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  data: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

type NotificationRecipient = {
  id: string
  email: string
  phone: string | null
  tenantId: string
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly gateway: NotificationsGateway) {}

  async list(actor: ActorContext, query: NotificationsQueryDto) {
    const { tenantId, targetUserId } = this.assertScope(actor, {
      tenantId: query.tenantId,
      userId: query.userId,
    })
    const page = query.page
    const limit = query.limit
    const unreadOnly = query.unreadOnly === "true"

    const filters = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, targetUserId),
      isNull(notifications.deletedAt),
      query.type ? eq(notifications.type, query.type) : undefined,
      unreadOnly ? eq(notifications.isRead, false) : undefined,
      query.search?.trim()
        ? or(
            ilike(notifications.title, `%${query.search.trim()}%`),
            ilike(notifications.message, `%${query.search.trim()}%`)
          )
        : undefined,
    ].filter((value): value is NonNullable<typeof value> => Boolean(value))

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...filters))
    const total = totalRows[0]?.total ?? 0

    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit

    const orderField = query.sort === "updatedAt" ? notifications.updatedAt : notifications.createdAt
    const orderBy = query.order === "asc" ? asc(orderField) : desc(orderField)

    const rows = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        tenantId: notifications.tenantId,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        isRead: notifications.isRead,
        data: notifications.data,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
      })
      .from(notifications)
      .where(and(...filters))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    return {
      success: true as const,
      data: rows.map((row) => this.mapNotificationRow(row)),
      meta: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    }
  }

  async getUnreadCount(actor: ActorContext, query: NotificationScopeQueryDto) {
    const { tenantId, targetUserId } = this.assertScope(actor, query)

    const unreadCount = await this.countUnreadForUser(tenantId, targetUserId)

    return {
      success: true as const,
      data: {
        tenantId,
        userId: targetUserId,
        unreadCount: unreadCount ?? 0,
      },
    }
  }

  async markRead(actor: ActorContext, id: string, payload: MarkNotificationReadDto) {
    const { tenantId, targetUserId } = this.assertScope(actor, { tenantId: payload.tenantId })

    const [existing] = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        tenantId: notifications.tenantId,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, targetUserId),
          isNull(notifications.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      throw new NotFoundException("Notification not found")
    }

    const readValue = payload.read ?? true
    await db
      .update(notifications)
      .set({
        isRead: readValue,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, existing.id))

    const unread = await this.getUnreadCount(actor, { tenantId, userId: targetUserId })
    this.gateway.emitUnreadCount(tenantId, targetUserId, unread.data.unreadCount)

    return {
      success: true as const,
      data: {
        id: existing.id,
        isRead: readValue,
      },
    }
  }

  async send(actor: ActorContext, payload: SendNotificationDto) {
    this.assertActorCanSend(actor, payload.tenantId)

    const uniqueRecipientIds = Array.from(new Set(payload.recipientUserIds))
    if (uniqueRecipientIds.length === 0) {
      return {
        success: true as const,
        data: {
          recipients: 0,
          channels: payload.channels ?? ["in_app"],
          created: 0,
          emailDispatched: 0,
          smsDispatched: 0,
        },
      }
    }

    const recipients = await this.getRecipients(payload.tenantId, uniqueRecipientIds)
    if (recipients.length !== uniqueRecipientIds.length) {
      throw new NotFoundException("One or more recipients not found in tenant")
    }

    const channels = this.resolveChannels(payload.channels)
    const type = payload.type ?? "info"

    let created = 0
    if (channels.includes("in_app")) {
      const inserted = await db
        .insert(notifications)
        .values(
          recipients.map((recipient) => ({
            tenantId: payload.tenantId,
            userId: recipient.id,
            title: payload.title,
            message: payload.message,
            type,
          }))
        )
        .returning({
          id: notifications.id,
          userId: notifications.userId,
          tenantId: notifications.tenantId,
          title: notifications.title,
          message: notifications.message,
          type: notifications.type,
          isRead: notifications.isRead,
          data: notifications.data,
          createdAt: notifications.createdAt,
          updatedAt: notifications.updatedAt,
        })

      created = inserted.length
      for (const row of inserted) {
        const mapped = this.mapNotificationRow(row)
        this.gateway.emitToUser(mapped.tenantId, mapped.userId, mapped)
      }
    }

    const emailDispatched = channels.includes("email")
      ? await this.dispatchEmail(recipients, payload.title, payload.message)
      : 0
    const smsDispatched = channels.includes("sms")
      ? await this.dispatchSms(recipients, payload.message)
      : 0

    if (channels.includes("in_app")) {
      for (const recipient of recipients) {
        const unreadCount = await this.countUnreadForUser(payload.tenantId, recipient.id)
        this.gateway.emitUnreadCount(payload.tenantId, recipient.id, unreadCount)
      }
    }

    return {
      success: true as const,
      data: {
        recipients: recipients.length,
        channels,
        created,
        emailDispatched,
        smsDispatched,
      },
    }
  }

  private async getRecipients(tenantId: string, recipientIds: string[]): Promise<NotificationRecipient[]> {
    return db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        tenantId: users.tenantId,
      })
      .from(users)
      .where(
        and(eq(users.tenantId, tenantId), inArray(users.id, recipientIds), isNull(users.deletedAt))
      )
  }

  private async dispatchEmail(
    recipients: NotificationRecipient[],
    title: string,
    message: string
  ): Promise<number> {
    const eligible = recipients.filter((recipient) => recipient.email.length > 0)
    if (eligible.length === 0) return 0

    this.logger.log(
      `Email notification dispatch requested for ${eligible.length} recipient(s): ${title}`
    )
    this.logger.debug(`Email payload preview: ${message.slice(0, 120)}`)
    return eligible.length
  }

  private async dispatchSms(recipients: NotificationRecipient[], message: string): Promise<number> {
    const eligible = recipients.filter((recipient) => Boolean(recipient.phone))
    if (eligible.length === 0) return 0

    this.logger.log(`SMS notification dispatch requested for ${eligible.length} recipient(s)`)
    this.logger.debug(`SMS payload preview: ${message.slice(0, 120)}`)
    return eligible.length
  }

  private async countUnreadForUser(tenantId: string, userId: string): Promise<number> {
    const unreadRows = await db
      .select({
        unreadCount: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt)
        )
      )

    return unreadRows[0]?.unreadCount ?? 0
  }

  private assertScope(
    actor: ActorContext,
    input: { tenantId: string; userId?: string }
  ): { tenantId: string; targetUserId: string } {
    const isPlatformAdmin = actor.roles?.includes("platform_admin") ?? false
    if (!isPlatformAdmin && actor.tenantId && actor.tenantId !== input.tenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }

    const targetUserId = input.userId ?? actor.id
    if (!isPlatformAdmin && targetUserId !== actor.id) {
      throw new ForbiddenException("Cannot access another user's notifications")
    }

    return { tenantId: input.tenantId, targetUserId }
  }

  private assertActorCanSend(actor: ActorContext, tenantId: string): void {
    const roles = new Set(actor.roles ?? [])
    const canSend = roles.has("platform_admin") || roles.has("school_admin") || roles.has("teacher")
    if (!canSend) {
      throw new ForbiddenException("Insufficient permissions to send notifications")
    }

    const isPlatformAdmin = roles.has("platform_admin")
    if (!isPlatformAdmin && actor.tenantId && actor.tenantId !== tenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }
  }

  private resolveChannels(channels?: NotificationChannel[]): NotificationChannel[] {
    if (!channels || channels.length === 0) {
      return ["in_app"]
    }

    return Array.from(new Set(channels))
  }

  private mapNotificationRow(row: {
    id: string
    userId: string
    tenantId: string
    title: string
    message: string
    type: NotificationType
    isRead: boolean
    data: unknown
    createdAt: Date
    updatedAt: Date
  }): NotificationListItem {
    const data =
      row.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : null

    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.isRead,
      data,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
