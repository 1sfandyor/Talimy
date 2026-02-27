import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string
      tenantId?: string
      roles?: string[]
      genderScope?: "male" | "female" | "all" | null
    }
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: number | null
    authError?: string | null
  }

  interface User {
    id: string
    email: string
    tenantId: string
    roles: string[]
    genderScope: "male" | "female" | "all"
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string
    roles?: string[]
    genderScope?: "male" | "female" | "all"
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    authError?: string
  }
}
