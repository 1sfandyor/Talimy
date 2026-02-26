"use client"

import { SessionProvider, useSession } from "next-auth/react"
import type { Session } from "next-auth"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { NEXTAUTH_PLACEHOLDER_ENABLED } from "@/lib/auth-options"
import { useAuthStore, type AuthUser } from "@/stores/auth-store"

type AuthProviderProps = {
  children: ReactNode
  session?: Session | null
}

export function AuthProvider({ children, session = null }: AuthProviderProps) {
  if (NEXTAUTH_PLACEHOLDER_ENABLED) {
    return <>{children}</>
  }

  return (
    <SessionProvider session={session}>
      <AuthStoreHydrator>{children}</AuthStoreHydrator>
    </SessionProvider>
  )
}

type AuthStoreHydratorProps = {
  children: ReactNode
}

function AuthStoreHydrator({ children }: AuthStoreHydratorProps) {
  const setSession = useAuthStore((state) => state.setSession)
  const setAuthStatus = useAuthStore((state) => state.setAuthStatus)
  const clearSession = useAuthStore((state) => state.clearSession)

  const sessionRecord = (session: Session | null | undefined): Record<string, unknown> | null => {
    if (!session?.user || typeof session.user !== "object") {
      return null
    }
    return session.user as unknown as Record<string, unknown>
  }

  const readString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined

  const readStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

  const sessionState = useSessionSnapshot()

  useEffect(() => {
    if (sessionState.status === "loading") {
      setAuthStatus("loading")
      return
    }

    if (sessionState.status === "unauthenticated") {
      clearSession()
      return
    }

    const userRecord = sessionRecord(sessionState.session)
    const userId = readString(userRecord?.id) ?? readString(userRecord?.sub)
    if (!userId) {
      setAuthStatus("unauthenticated")
      return
    }

    const tenantId = readString(userRecord?.tenantId)
    const roles = readStringArray(userRecord?.roles)
    const permissions = readStringArray(userRecord?.permissions)
    const genderScopeValue = readString(userRecord?.genderScope)

    const user: AuthUser = {
      id: userId,
      tenantId,
      roles,
      genderScope:
        genderScopeValue === "male" || genderScopeValue === "female" || genderScopeValue === "all"
          ? genderScopeValue
          : undefined,
      name: readString(userRecord?.name) ?? null,
      email: readString(userRecord?.email) ?? null,
    }

    setSession({
      user,
      accessToken: null,
      refreshToken: null,
      tenant: tenantId
        ? {
            id: tenantId,
            slug: readString(userRecord?.tenantSlug) ?? null,
            name: readString(userRecord?.tenantName) ?? null,
          }
        : null,
      permissions,
    })
  }, [clearSession, sessionState, setAuthStatus, setSession])

  return <>{children}</>
}

function useSessionSnapshot(): {
  session: Session | null
  status: "loading" | "authenticated" | "unauthenticated"
} {
  const { data, status } = useSession()
  return { session: data, status }
}
