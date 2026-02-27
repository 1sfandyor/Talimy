import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  APP_LOCALE_COOKIE,
  DEFAULT_LOCALE,
  PANEL_PREFIXES,
  resolveLocaleFromAcceptLanguage,
} from "./src/config/site"
import { hasAuthContext, resolveHostScopeFromHeaders } from "./src/lib/server/request-host"

type HostScope =
  | { kind: "api" }
  | { kind: "platform" }
  | { kind: "public" }
  | { kind: "school"; tenantSlug: string }

const ROLE_PATH_PREFIXES = [
  ...PANEL_PREFIXES.admin,
  ...PANEL_PREFIXES.teacher,
  ...PANEL_PREFIXES.student,
  ...PANEL_PREFIXES.parent,
] as const
const AUTH_PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"])

export function proxy(request: NextRequest) {
  const scope = resolveHostScope(request)
  const pathname = request.nextUrl.pathname
  const locale = resolveRequestLocale(request)
  const isApiOrAssetPath = shouldBypassLocaleHandling(pathname)

  if (scope.kind === "platform" && pathname === "/") {
    return finalizeResponse(request, scope, locale, redirect(request, "/platform"))
  }

  if (scope.kind === "platform" && isSchoolPanelPath(pathname)) {
    return finalizeResponse(request, scope, locale, redirect(request, "/platform"))
  }

  if (
    scope.kind === "public" &&
    (pathname.startsWith("/platform") || isSchoolPanelPath(pathname))
  ) {
    return finalizeResponse(request, scope, locale, redirect(request, "/login"))
  }

  if (
    !isApiOrAssetPath &&
    requiresLightweightAuthGate(scope, pathname) &&
    !hasPlaceholderAuthContext(request)
  ) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set("next", nextPath)
    return finalizeResponse(request, scope, locale, NextResponse.redirect(loginUrl))
  }

  const forwardedHeaders = new Headers(request.headers)
  forwardedHeaders.set("x-locale", locale)
  forwardedHeaders.set("x-host-scope", scope.kind)
  forwardedHeaders.set("x-panel-scope", resolvePanelScope(pathname))

  if (scope.kind === "school") {
    if (pathname === "/") {
      return finalizeResponse(request, scope, locale, redirect(request, "/login"))
    }
    if (pathname.startsWith("/platform")) {
      return finalizeResponse(request, scope, locale, redirect(request, "/login"))
    }

    forwardedHeaders.set("x-tenant-slug", scope.tenantSlug)
  }

  const response = NextResponse.next({
    request: {
      headers: forwardedHeaders,
    },
  })

  return finalizeResponse(request, scope, locale, response)
}

function resolveHostScope(request: NextRequest): HostScope {
  return resolveHostScopeFromHeaders(request.headers) as HostScope
}

function isSchoolPanelPath(pathname: string): boolean {
  return ROLE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function requiresLightweightAuthGate(scope: HostScope, pathname: string): boolean {
  if (AUTH_PUBLIC_PATHS.has(pathname)) {
    return false
  }

  if (pathname === "/") {
    return false
  }

  if (scope.kind === "platform") {
    return pathname.startsWith("/platform")
  }

  if (scope.kind === "school") {
    return isSchoolPanelPath(pathname)
  }

  return false
}

function hasPlaceholderAuthContext(request: NextRequest): boolean {
  return hasAuthContext(request.headers, request.cookies)
}

function resolvePanelScope(pathname: string): string {
  if (pathname.startsWith("/platform")) return "platform"
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/teacher")) return "teacher"
  if (pathname.startsWith("/student")) return "student"
  if (pathname.startsWith("/parent")) return "parent"
  return "public"
}

function shouldBypassLocaleHandling(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  )
}

function resolveRequestLocale(request: NextRequest): string {
  const fromQuery = request.nextUrl.searchParams.get("lang")?.trim().toLowerCase()
  if (fromQuery === "uz" || fromQuery === "tr" || fromQuery === "en" || fromQuery === "ru") {
    return fromQuery
  }

  const fromCookie = request.cookies.get(APP_LOCALE_COOKIE)?.value?.trim().toLowerCase()
  if (fromCookie === "uz" || fromCookie === "tr" || fromCookie === "en" || fromCookie === "ru") {
    return fromCookie
  }

  return resolveLocaleFromAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE
}

function finalizeResponse(
  request: NextRequest,
  scope: HostScope,
  locale: string,
  response: NextResponse
): NextResponse {
  if (!shouldBypassLocaleHandling(request.nextUrl.pathname)) {
    response.cookies.set(APP_LOCALE_COOKIE, locale, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  response.headers.set("x-locale", locale)
  response.headers.set("x-host-scope", scope.kind)
  response.headers.set("x-panel-scope", resolvePanelScope(request.nextUrl.pathname))

  if (scope.kind === "school") {
    response.cookies.set("tenant_slug", scope.tenantSlug, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  return response
}

function redirect(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}

export default proxy
