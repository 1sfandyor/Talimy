"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  createNotificationsSocketClient,
  type NotificationsSocketClient,
  type SocketConnectionStatus,
  type SocketEventHandler,
} from "@/lib/socket"

type SocketContextValue = {
  endpoint: string
  isConnected: boolean
  status: SocketConnectionStatus
  isSupported: boolean
  lastError: string | null
  connect: () => Promise<boolean>
  disconnect: () => void
  emit: (event: string, payload?: unknown) => void
  subscribe: (event: string, handler: SocketEventHandler) => () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

type SocketProviderProps = {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const clientRef = useRef<NotificationsSocketClient | null>(null)
  const [status, setStatus] = useState<SocketConnectionStatus>("idle")
  const [lastError, setLastError] = useState<string | null>(null)

  if (!clientRef.current) {
    clientRef.current = createNotificationsSocketClient()
  }

  const client = clientRef.current

  const connect = useCallback(async () => {
    setStatus("connecting")
    const connected = await client.connect()
    const nextStatus = client.getStatus()
    setStatus(connected ? "connected" : nextStatus)
    setLastError(client.getLastError())
    return connected
  }, [client])

  const disconnect = useCallback(() => {
    client.disconnect()
    setStatus(client.getStatus())
    setLastError(client.getLastError())
  }, [client])

  const emit = useCallback(
    (event: string, payload?: unknown) => {
      client.emit(event, payload)
    },
    [client]
  )

  const subscribe = useCallback(
    (event: string, handler: SocketEventHandler) => client.subscribe(event, handler),
    [client]
  )

  const value = useMemo<SocketContextValue>(
    () => ({
      endpoint: client.endpoint,
      isConnected: status === "connected",
      status,
      isSupported: client.isSupported,
      lastError,
      connect,
      disconnect,
      emit,
      subscribe,
    }),
    [client.endpoint, client.isSupported, connect, disconnect, emit, lastError, status, subscribe]
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider")
  }
  return context
}
