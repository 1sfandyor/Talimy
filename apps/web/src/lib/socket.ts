import { getApiOrigin } from "@/config/site"

export const NOTIFICATIONS_SOCKET_NAMESPACE = "/notifications"
export type SocketConnectionStatus = "idle" | "connecting" | "connected" | "disabled" | "error"
export type SocketEventHandler = (payload: unknown) => void

export type NotificationsSocketClient = {
  readonly endpoint: string
  readonly isSupported: boolean
  connect: () => Promise<boolean>
  disconnect: () => void
  emit: (event: string, payload?: unknown) => void
  subscribe: (event: string, handler: SocketEventHandler) => () => void
  getStatus: () => SocketConnectionStatus
  getLastError: () => string | null
}

export function getNotificationsSocketUrl(): string {
  const apiOrigin = getApiOrigin()
  if (apiOrigin.startsWith("https://")) {
    return apiOrigin.replace("https://", "wss://") + NOTIFICATIONS_SOCKET_NAMESPACE
  }
  if (apiOrigin.startsWith("http://")) {
    return apiOrigin.replace("http://", "ws://") + NOTIFICATIONS_SOCKET_NAMESPACE
  }
  return `${apiOrigin}${NOTIFICATIONS_SOCKET_NAMESPACE}`
}

export function createNotificationsSocketClient(): NotificationsSocketClient {
  const endpoint = getNotificationsSocketUrl()
  const listeners = new Map<string, Set<SocketEventHandler>>()
  let status: SocketConnectionStatus = "idle"
  let lastError: string | null = null

  const notify = (event: string, payload: unknown) => {
    const handlers = listeners.get(event)
    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      try {
        handler(payload)
      } catch {
        // Hooks should not break the provider event loop.
      }
    }
  }

  return {
    endpoint,
    // `socket.io-client` is intentionally optional at this phase; the API is ready and can be
    // activated when the package is added during runtime integration.
    isSupported: false,
    async connect() {
      status = "disabled"
      lastError = "Socket.IO client package is not installed in apps/web yet"
      notify("socket:error", { message: lastError })
      return false
    },
    disconnect() {
      status = "idle"
    },
    emit(event, payload) {
      notify(event, payload)
    },
    subscribe(event, handler) {
      const existing = listeners.get(event) ?? new Set<SocketEventHandler>()
      existing.add(handler)
      listeners.set(event, existing)

      return () => {
        const current = listeners.get(event)
        if (!current) {
          return
        }
        current.delete(handler)
        if (current.size === 0) {
          listeners.delete(event)
        }
      }
    },
    getStatus() {
      return status
    },
    getLastError() {
      return lastError
    },
  }
}
