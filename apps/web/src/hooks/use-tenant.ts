"use client"

import { useMemo } from "react"

import { SITE_DOMAIN } from "@/config/site"
import { useAuthStore } from "@/stores/auth-store"

export type TenantHostInfo = {
  host: string
  tenantSlug: string | null
  isPlatformHost: boolean
  isSchoolHost: boolean
  isPublicHost: boolean
}

function parseTenantHost(host: string): TenantHostInfo {
  const normalizedHost = host.toLowerCase().split(":")[0] ?? ""
  const isLocalhost = normalizedHost.endsWith(".localhost") || normalizedHost === "localhost"

  if (normalizedHost === `platform.${SITE_DOMAIN}`) {
    return {
      host: normalizedHost,
      tenantSlug: null,
      isPlatformHost: true,
      isSchoolHost: false,
      isPublicHost: false,
    }
  }

  if (
    normalizedHost === SITE_DOMAIN ||
    normalizedHost === `www.${SITE_DOMAIN}` ||
    normalizedHost === "localhost"
  ) {
    return {
      host: normalizedHost,
      tenantSlug: null,
      isPlatformHost: false,
      isSchoolHost: false,
      isPublicHost: true,
    }
  }

  if (isLocalhost) {
    const parts = normalizedHost.split(".")
    const slug = parts.length > 1 ? (parts[0] ?? null) : null
    const tenantSlug = slug && !["api", "platform", "www"].includes(slug) ? slug : null
    return {
      host: normalizedHost,
      tenantSlug,
      isPlatformHost: false,
      isSchoolHost: Boolean(tenantSlug),
      isPublicHost: !tenantSlug,
    }
  }

  if (normalizedHost.endsWith(`.${SITE_DOMAIN}`)) {
    const slug = normalizedHost.slice(0, -(SITE_DOMAIN.length + 1))
    if (slug && slug !== "api" && slug !== "platform" && slug !== "www") {
      return {
        host: normalizedHost,
        tenantSlug: slug,
        isPlatformHost: false,
        isSchoolHost: true,
        isPublicHost: false,
      }
    }
  }

  return {
    host: normalizedHost,
    tenantSlug: null,
    isPlatformHost: false,
    isSchoolHost: false,
    isPublicHost: true,
  }
}

export function useTenant() {
  const authTenant = useAuthStore((state) => state.tenant)
  const authUserTenantId = useAuthStore((state) => state.user?.tenantId)

  return useMemo(() => {
    if (typeof window === "undefined") {
      const fallback = parseTenantHost("")
      return {
        ...fallback,
        tenantId: authTenant?.id ?? authUserTenantId ?? null,
        tenantName: authTenant?.name ?? null,
        source: authTenant?.id ? ("auth" as const) : ("host" as const),
      }
    }

    const hostInfo = parseTenantHost(window.location.host)
    return {
      ...hostInfo,
      tenantId: authTenant?.id ?? authUserTenantId ?? null,
      tenantName: authTenant?.name ?? null,
      tenantSlug: authTenant?.slug ?? hostInfo.tenantSlug,
      source: authTenant?.id ? ("auth" as const) : ("host" as const),
    }
  }, [authTenant, authUserTenantId])
}
