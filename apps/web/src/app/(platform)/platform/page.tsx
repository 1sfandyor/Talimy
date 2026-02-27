import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { resolveHostScopeFromHeaders } from "@/lib/server/request-host"

export default async function Page() {
  const requestHeaders = await headers()
  const hostScope = resolveHostScopeFromHeaders(requestHeaders)

  if (hostScope.kind !== "platform") {
    redirect("/login")
  }

  return null
}
