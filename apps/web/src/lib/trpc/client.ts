import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@talimy/trpc"
import { trpcTransformer } from "@talimy/trpc/src/transformer"

import { APP_LOCALE_COOKIE, getWebOrigin } from "@/config/site"
import { getStoredAuthTokens } from "@/lib/auth"

export function getTrpcHttpUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/trpc`
  }
  return `${getWebOrigin()}/api/trpc`
}

export function createBrowserTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getTrpcHttpUrl(),
        transformer: trpcTransformer,
        headers() {
          const tokens = getStoredAuthTokens()
          const tenantSlug = readCookie("tenant_slug")
          const locale = readCookie(APP_LOCALE_COOKIE)
          const headers: Record<string, string> = {}

          if (!tokens?.accessToken) {
            if (tenantSlug) {
              headers["x-tenant-slug"] = tenantSlug
            }
            if (locale) {
              headers["x-locale"] = locale
            }
            return headers
          }

          headers.authorization = `Bearer ${tokens.accessToken}`
          if (tenantSlug) {
            headers["x-tenant-slug"] = tenantSlug
          }
          if (locale) {
            headers["x-locale"] = locale
          }
          return headers
        },
      }),
    ],
  })
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined
  }

  const prefix = `${name}=`
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  if (!value) {
    return undefined
  }

  const raw = value.slice(prefix.length)
  return raw.length > 0 ? decodeURIComponent(raw) : undefined
}
