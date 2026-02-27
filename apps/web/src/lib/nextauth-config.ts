import { loginSchema } from "@talimy/shared"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { getApiProxyOrigin } from "@/config/site"
import { AUTH_ROUTE_PATHS } from "@/lib/auth-options"

type GenderScope = "male" | "female" | "all"

type AuthIdentity = {
  sub: string
  email: string
  tenantId: string
  roles: string[]
  genderScope: GenderScope
}

type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

type BackendEnvelope = {
  success?: boolean
  data?: AuthSession
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
}

type AuthUser = {
  id: string
  email: string
  tenantId: string
  roles: string[]
  genderScope: GenderScope
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000

export const nextAuthConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: AUTH_ROUTE_PATHS.login,
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          return null
        }

        const loginSession = await requestAuthSession("/api/auth/login", parsed.data)
        if (!loginSession) {
          return null
        }

        const identity = decodeAccessIdentity(loginSession.accessToken)
        if (!identity) {
          return null
        }

        return {
          id: identity.sub,
          email: identity.email,
          tenantId: identity.tenantId,
          roles: identity.roles,
          genderScope: identity.genderScope,
          accessToken: loginSession.accessToken,
          refreshToken: loginSession.refreshToken,
          expiresAt: toExpiresAt(loginSession.expiresIn),
        } satisfies AuthUser
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser
        token.sub = authUser.id
        token.email = authUser.email
        token.tenantId = authUser.tenantId
        token.roles = authUser.roles
        token.genderScope = authUser.genderScope
        token.accessToken = authUser.accessToken
        token.refreshToken = authUser.refreshToken
        token.expiresAt = authUser.expiresAt
        return token
      }

      const expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : 0
      if (expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_SKEW_MS) {
        return token
      }

      if (typeof token.refreshToken !== "string" || token.refreshToken.length === 0) {
        return token
      }

      const refreshedSession = await requestAuthSession("/api/auth/refresh", {
        refreshToken: token.refreshToken,
      })
      if (!refreshedSession) {
        token.authError = "refresh_failed"
        return token
      }

      const refreshedIdentity = decodeAccessIdentity(refreshedSession.accessToken)
      if (!refreshedIdentity) {
        token.authError = "refresh_payload_invalid"
        return token
      }

      token.sub = refreshedIdentity.sub
      token.email = refreshedIdentity.email
      token.tenantId = refreshedIdentity.tenantId
      token.roles = refreshedIdentity.roles
      token.genderScope = refreshedIdentity.genderScope
      token.accessToken = refreshedSession.accessToken
      token.refreshToken = refreshedSession.refreshToken
      token.expiresAt = toExpiresAt(refreshedSession.expiresIn)
      delete token.authError
      return token
    },
    async session({ session, token }) {
      const existingUser = session.user ?? { name: null, email: null, image: null }
      const resolvedGenderScope = normalizeGenderScope(token.genderScope) ?? "all"
      session.user = {
        ...existingUser,
        id: typeof token.sub === "string" ? token.sub : "",
        email: typeof token.email === "string" ? token.email : existingUser.email,
        tenantId: typeof token.tenantId === "string" ? token.tenantId : "",
        roles: normalizeStringArray(token.roles),
        genderScope: resolvedGenderScope,
      }

      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : null
      session.refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : null
      session.expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : null
      session.authError = typeof token.authError === "string" ? token.authError : null

      return session
    },
  },
  events: {
    async signOut(message) {
      const refreshToken =
        "token" in message && message.token && typeof message.token.refreshToken === "string"
          ? message.token.refreshToken
          : ""
      if (!refreshToken) {
        return
      }

      await requestAuthSession("/api/auth/logout", { refreshToken })
    },
  },
}

async function requestAuthSession(pathname: string, payload: Record<string, unknown>) {
  const response = await fetch(`${getApiProxyOrigin()}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  let parsed = {}
  try {
    parsed = (await response.json()) as BackendEnvelope
  } catch {
    return null
  }

  return extractSession(parsed)
}

function extractSession(payload: BackendEnvelope): AuthSession | null {
  if (isAuthSession(payload.data)) {
    return payload.data
  }

  if (isAuthSession(payload)) {
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    }
  }

  return null
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false
  }

  const session = value as Partial<AuthSession>
  return (
    typeof session.accessToken === "string" &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" &&
    session.refreshToken.length > 0 &&
    typeof session.expiresIn === "number" &&
    Number.isFinite(session.expiresIn) &&
    session.expiresIn > 0
  )
}

function decodeAccessIdentity(accessToken: string): AuthIdentity | null {
  const parts = accessToken.split(".")
  if (parts.length !== 3 || !parts[1]) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Partial<{
      sub: unknown
      email: unknown
      tenantId: unknown
      roles: unknown
      genderScope: unknown
    }>

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.tenantId !== "string"
    ) {
      return null
    }

    const roles = normalizeStringArray(payload.roles)
    const genderScope = normalizeGenderScope(payload.genderScope)
    if (!genderScope) {
      return null
    }

    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles,
      genderScope,
    }
  } catch {
    return null
  }
}

function toExpiresAt(expiresInSeconds: number): number {
  const safeExpiresIn = Number.isFinite(expiresInSeconds) ? expiresInSeconds : 900
  return Date.now() + Math.max(safeExpiresIn, 1) * 1000
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function normalizeGenderScope(value: unknown): GenderScope | null {
  if (value === "male" || value === "female" || value === "all") {
    return value
  }
  return null
}
