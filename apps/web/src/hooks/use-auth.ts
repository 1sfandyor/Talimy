"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"

import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const session = useSession()
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.tenant)
  const permissions = useAuthStore((state) => state.permissions)
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  const isAuthenticated = useMemo(
    () => session.status === "authenticated" || Boolean(user && accessToken),
    [accessToken, session.status, user]
  )
  const roles = user?.roles ?? []
  const roleSet = useMemo(() => new Set(roles), [roles])
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  return {
    session: session.data,
    sessionStatus: session.status,
    authStatus,
    user,
    tenant,
    roles,
    permissions,
    accessToken,
    refreshToken,
    isAuthenticated,
    hasRole: (role: string) => roleSet.has(role),
    can: (permission: string) => roleSet.has("platform_admin") || permissionSet.has(permission),
    setSession,
    clearSession,
  }
}
