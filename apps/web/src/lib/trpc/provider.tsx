"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"

import { createBrowserTrpcClient } from "./client"

const TrpcClientContext = createContext<ReturnType<typeof createBrowserTrpcClient> | null>(null)

type TrpcProviderProps = {
  children: ReactNode
}

export function TrpcProvider({ children }: TrpcProviderProps) {
  const client = useMemo(() => createBrowserTrpcClient(), [])
  return <TrpcClientContext.Provider value={client}>{children}</TrpcClientContext.Provider>
}

export function useTrpcClient() {
  const client = useContext(TrpcClientContext)
  if (!client) {
    throw new Error("useTrpcClient must be used within TrpcProvider")
  }
  return client
}
