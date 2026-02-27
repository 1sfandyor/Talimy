import NextAuth from "next-auth"

import { nextAuthConfig } from "@/lib/nextauth-config"

export const runtime = "nodejs"

const { handlers } = NextAuth(nextAuthConfig)

export const { GET, POST } = handlers
