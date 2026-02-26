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

import { AuthService } from "../auth/auth.service"

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

type SocketIdentity = {
  userId: string
  tenantId: string
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

  constructor(private readonly authService: AuthService) {}

  @WebSocketServer()
  server?: Server

  handleConnection(client: Socket): void {
    const identity = this.resolveConnectionIdentity(client)
    if (!identity) {
      this.logger.warn(`Socket ${client.id} rejected: missing or invalid access token`)
      client.disconnect(true)
      return
    }

    this.setClientIdentity(client, identity)
    void client.join(this.getTenantRoom(identity.tenantId))
    void client.join(this.getUserRoom(identity.tenantId, identity.userId))
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Notifications socket disconnected: ${client.id}`)
  }

  @SubscribeMessage("notifications.join")
  async joinRooms(
    @ConnectedSocket() client: Socket,
    @MessageBody() _body: { tenantId?: string; userId?: string }
  ): Promise<{ success: true; rooms: string[] }> {
    const identity = this.getClientIdentity(client) ?? this.resolveConnectionIdentity(client)
    if (!identity) {
      client.disconnect(true)
      return { success: true, rooms: [] }
    }

    this.setClientIdentity(client, identity)
    const rooms = [
      this.getTenantRoom(identity.tenantId),
      this.getUserRoom(identity.tenantId, identity.userId),
    ]
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

  private resolveConnectionIdentity(client: Socket): SocketIdentity | null {
    const token = this.readAccessToken(client)
    if (!token) {
      return null
    }

    try {
      const payload = this.authService.verifyAccessToken(token)
      return {
        tenantId: payload.tenantId,
        userId: payload.sub,
      }
    } catch {
      return null
    }
  }

  private getClientIdentity(client: Socket): SocketIdentity | null {
    const raw = (client.data as Record<string, unknown>).identity
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null
    }

    const identity = raw as Partial<SocketIdentity>
    if (!identity.tenantId || !identity.userId) {
      return null
    }

    return { tenantId: identity.tenantId, userId: identity.userId }
  }

  private setClientIdentity(client: Socket, identity: SocketIdentity): void {
    const socketData = client.data as Record<string, unknown>
    socketData.identity = identity
  }

  private readAccessToken(client: Socket): string | null {
    const authToken =
      this.readHandshakeValue(client, "token") ?? this.readHandshakeValue(client, "accessToken")
    if (authToken) {
      return authToken
    }

    const authorization = this.readHandshakeHeader(client, "authorization")
    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim()
    }

    return null
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

    const headerValue = this.readHandshakeHeader(client, `x-${key.toLowerCase()}`)
    if (headerValue) {
      return headerValue
    }

    return null
  }

  private readHandshakeHeader(client: Socket, key: string): string | null {
    const headerValue = client.handshake.headers[key]
    if (typeof headerValue === "string" && headerValue.length > 0) {
      return headerValue
    }
    if (Array.isArray(headerValue)) {
      return typeof headerValue[0] === "string" ? (headerValue[0] ?? null) : null
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
