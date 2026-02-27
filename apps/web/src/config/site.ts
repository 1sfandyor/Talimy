export const SITE_NAME = "Talimy"
export const SITE_DOMAIN = "talimy.space"
export const APP_LOCALE_COOKIE = "NEXT_LOCALE"

export const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const

export const RESERVED_SUBDOMAINS = ["www", "api", "platform", "localhost"] as const

export const SUPPORTED_LOCALES = ["uz", "tr", "en", "ru"] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "uz"

export type AppPanel = "platform" | "admin" | "teacher" | "student" | "parent"

export const PANEL_PREFIXES = {
  platform: ["/dashboard", "/schools", "/settings"] as const,
  admin: ["/admin"] as const,
  teacher: ["/teacher"] as const,
  student: ["/student"] as const,
  parent: ["/parent"] as const,
} as const

export function getWebOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

export function getApiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "")
}

export function getApiProxyOrigin(): string {
  return (
    process.env.API_PROXY_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "")
}

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return isSupportedLocale(normalized) ? normalized : null
}

export function resolveLocaleFromAcceptLanguage(
  headerValue: string | null | undefined
): AppLocale | null {
  if (!headerValue) {
    return null
  }

  const candidates = headerValue
    .split(",")
    .map((segment) => segment.split(";")[0]?.trim().toLowerCase())
    .filter((segment): segment is string => Boolean(segment))

  for (const candidate of candidates) {
    if (isSupportedLocale(candidate)) {
      return candidate
    }

    const baseLanguage = candidate.split("-")[0]
    if (baseLanguage && isSupportedLocale(baseLanguage)) {
      return baseLanguage
    }
  }

  return null
}
