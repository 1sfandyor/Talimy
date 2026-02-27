import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { hasAuthContext, resolveHostScopeFromHeaders } from "@/lib/server/request-host"

export default async function Page() {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()])
  const hostScope = resolveHostScopeFromHeaders(requestHeaders)

  if (hostScope.kind === "public") {
    redirect("/login")
  }

  if (hostScope.kind === "school" && !hasAuthContext(requestHeaders, cookieStore)) {
    redirect("/login")
  }

  return null
}
