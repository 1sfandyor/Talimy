import { AUTH_COOKIE_NAMES, RESERVED_SUBDOMAINS } from "@/config/site"

type HeaderReader = {
  get(name: string): string | null
}

type CookieReader = {
  get(name: string): { value?: string } | undefined
}

export type RequestHostScope =
  | { kind: "api" }
  | { kind: "platform" }
  | { kind: "public" }
  | { kind: "school"; tenantSlug: string }

const RESERVED_SUBDOMAIN_SET = new Set<string>(RESERVED_SUBDOMAINS)

export function resolveHostScopeFromHeaders(headers: HeaderReader): RequestHostScope {
  const rawHost = resolveRequestHost(headers)
  const hostname = rawHost.toLowerCase().split(":")[0] ?? ""

  if (hostname === "api.talimy.space") {
    return { kind: "api" }
  }

  if (hostname === "platform.talimy.space") {
    return { kind: "platform" }
  }

  if (
    hostname === "talimy.space" ||
    hostname === "www.talimy.space" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return { kind: "public" }
  }

  if (hostname.endsWith(".localhost")) {
    const slug = hostname.slice(0, -".localhost".length)
    if (slug && !RESERVED_SUBDOMAIN_SET.has(slug)) {
      return { kind: "school", tenantSlug: slug }
    }
    return { kind: "public" }
  }

  if (hostname.endsWith(".talimy.space")) {
    const slug = hostname.slice(0, -".talimy.space".length)
    if (slug && !RESERVED_SUBDOMAIN_SET.has(slug)) {
      return { kind: "school", tenantSlug: slug }
    }
  }

  return { kind: "public" }
}

export function hasAuthContext(headers: HeaderReader, cookies: CookieReader): boolean {
  if (headers.get("authorization")) {
    return true
  }

  return AUTH_COOKIE_NAMES.some((cookieName) => Boolean(cookies.get(cookieName)?.value))
}

function resolveRequestHost(headers: HeaderReader): string {
  const candidates = [
    ...splitHostHeaderValues(headers.get("x-forwarded-host")),
    ...extractForwardedHeaderHosts(headers.get("forwarded")),
    ...splitHostHeaderValues(headers.get("host")),
  ]

  return candidates.find((candidate) => isRecognizedTenantHost(candidate)) ?? candidates[0] ?? ""
}

function splitHostHeaderValues(rawHeader: string | null): string[] {
  if (!rawHeader) {
    return []
  }

  return rawHeader
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function extractForwardedHeaderHosts(rawHeader: string | null): string[] {
  if (!rawHeader) {
    return []
  }

  return rawHeader
    .split(",")
    .map((segment) => {
      const match = segment.match(/(?:^|;)\s*host="?([^";,]+)"?/i)
      return match?.[1]?.trim() ?? ""
    })
    .filter(Boolean)
}

function isRecognizedTenantHost(rawHost: string): boolean {
  const hostname = rawHost.toLowerCase().split(":")[0] ?? ""
  return (
    hostname === "talimy.space" ||
    hostname === "www.talimy.space" ||
    hostname === "platform.talimy.space" ||
    hostname === "api.talimy.space" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".talimy.space") ||
    hostname.endsWith(".localhost")
  )
}
