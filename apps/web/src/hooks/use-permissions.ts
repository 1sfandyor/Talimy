"use client"

import { useMemo } from "react"

import { useAuthStore } from "@/stores/auth-store"

export function usePermissions() {
  const roles = useAuthStore((state) => state.user?.roles ?? [])
  const genderScope = useAuthStore((state) => state.user?.genderScope ?? "all")
  const permissions = useAuthStore((state) => state.permissions)

  return useMemo(() => {
    const roleSet = new Set(roles)
    const permissionSet = new Set(permissions)

    const can = (permission: string) =>
      roleSet.has("platform_admin") || permissionSet.has(permission)

    return {
      roles,
      permissions,
      genderScope,
      can,
      hasRole: (role: string) => roleSet.has(role),
      hasAnyRole: (...candidateRoles: string[]) => candidateRoles.some((role) => roleSet.has(role)),
      hasAllRoles: (...candidateRoles: string[]) =>
        candidateRoles.every((role) => roleSet.has(role)),
      isPlatformAdmin: roleSet.has("platform_admin"),
      isSchoolAdmin: roleSet.has("school_admin"),
      isTeacher: roleSet.has("teacher"),
      isStudent: roleSet.has("student"),
      isParent: roleSet.has("parent"),
    }
  }, [genderScope, permissions, roles])
}
