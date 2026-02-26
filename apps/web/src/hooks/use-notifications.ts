"use client"

import { useEffect } from "react"

import { useSocket } from "@/hooks/use-socket"
import { useNotificationStore } from "@/stores/notification-store"

export function useNotifications() {
  const socket = useSocket()
  const items = useNotificationStore((state) => state.items)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const setItems = useNotificationStore((state) => state.setItems)
  const upsertItem = useNotificationStore((state) => state.upsertItem)
  const markRead = useNotificationStore((state) => state.markRead)
  const clear = useNotificationStore((state) => state.clear)

  useEffect(() => {
    const subscribe = socket.subscribe
    const unsubscribers = [
      subscribe("notification:new", (payload) => {
        const normalized = toNotificationListItem(payload)
        if (normalized) {
          upsertItem(normalized)
        }
      }),
      subscribe("notification:created", (payload) => {
        const normalized = toNotificationListItem(payload)
        if (normalized) {
          upsertItem(normalized)
        }
      }),
    ]

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  }, [socket.subscribe, upsertItem])

  return {
    items,
    unreadCount,
    setItems,
    upsertItem,
    markRead,
    clear,
    socketStatus: socket.status,
    connectRealtime: socket.connectIfSupported,
    disconnectRealtime: socket.disconnect,
    realtimeSupported: socket.isSupported,
    realtimeError: socket.lastError,
  }
}

function toNotificationListItem(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const value = payload as Record<string, unknown>
  const id = typeof value.id === "string" ? value.id : null
  const title = typeof value.title === "string" ? value.title : null
  const message = typeof value.message === "string" ? value.message : null

  if (!id || !title || !message) {
    return null
  }

  const type =
    value.type === "success" || value.type === "warning" || value.type === "error"
      ? value.type
      : "info"

  return {
    id,
    title,
    message,
    type,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    isRead: typeof value.isRead === "boolean" ? value.isRead : false,
  } as const
}
