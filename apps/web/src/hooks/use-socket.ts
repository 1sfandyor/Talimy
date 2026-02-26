"use client"

import { useCallback, useMemo } from "react"

import { useSocketContext } from "@/providers/socket-provider"

export function useSocket() {
  const socket = useSocketContext()

  const connectIfSupported = useCallback(async () => {
    if (!socket.isSupported) {
      return false
    }
    return socket.connect()
  }, [socket])

  return useMemo(
    () => ({
      ...socket,
      connectIfSupported,
    }),
    [connectIfSupported, socket]
  )
}
