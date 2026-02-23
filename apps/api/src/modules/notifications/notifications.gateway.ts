import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets"
import { Logger } from "@nestjs/common"
import type { Server, Socket } from "socket.io"

type NotificationRealtimePayload = {
  id: string
  tenantId: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  data: Record<string, unknown> | null
  createdAt: string
}

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name)

  @WebSocketServer()
  server?: Server

  handleConnection(client: Socket): void {
    const { tenantId, userId } = this.resolveConnectionIdentity(client)
    if (!tenantId || !userId) {
      this.logger.warn(`Socket ${client.id} connected without tenant/user identity`)
      return
    }

    void client.join(this.getTenantRoom(tenantId))
    void client.join(this.getUserRoom(tenantId, userId))
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Notifications socket disconnected: ${client.id}`)
  }

  @SubscribeMessage("notifications.join")
  async joinRooms(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tenantId?: string; userId?: string }
  ): Promise<{ success: true; rooms: string[] }> {
    const tenantId = body.tenantId ?? this.readHandshakeValue(client, "tenantId")
    const userId = body.userId ?? this.readHandshakeValue(client, "userId")
    if (!tenantId || !userId) {
      return { success: true, rooms: [] }
    }

    const rooms = [this.getTenantRoom(tenantId), this.getUserRoom(tenantId, userId)]
    await Promise.all(rooms.map((room) => client.join(room)))
    return { success: true, rooms }
  }

  emitToUser(tenantId: string, userId: string, payload: NotificationRealtimePayload): void {
    this.server?.to(this.getUserRoom(tenantId, userId)).emit("notifications:new", payload)
  }

  emitUnreadCount(tenantId: string, userId: string, count: number): void {
    this.server
      ?.to(this.getUserRoom(tenantId, userId))
      .emit("notifications:unread-count", { tenantId, userId, count })
  }

  private resolveConnectionIdentity(client: Socket): { tenantId: string | null; userId: string | null } {
    return {
      tenantId: this.readHandshakeValue(client, "tenantId"),
      userId: this.readHandshakeValue(client, "userId"),
    }
  }

  private readHandshakeValue(client: Socket, key: string): string | null {
    const authValue = client.handshake.auth[key]
    if (typeof authValue === "string" && authValue.length > 0) {
      return authValue
    }

    const queryValue = client.handshake.query[key]
    if (typeof queryValue === "string" && queryValue.length > 0) {
      return queryValue
    }

    const headerKey = `x-${key.toLowerCase()}`
    const headerValue = client.handshake.headers[headerKey]
    if (typeof headerValue === "string" && headerValue.length > 0) {
      return headerValue
    }

    return null
  }

  private getTenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`
  }

  private getUserRoom(tenantId: string, userId: string): string {
    return `tenant:${tenantId}:user:${userId}`
  }
}
