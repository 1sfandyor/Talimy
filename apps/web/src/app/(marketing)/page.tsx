import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { resolveHostScopeFromHeaders } from "@/lib/server/request-host"

export default async function MarketingHomePage() {
  const requestHeaders = await headers()
  const hostScope = resolveHostScopeFromHeaders(requestHeaders)

  if (hostScope.kind === "platform") {
    redirect("/platform")
  }

  if (hostScope.kind === "school") {
    redirect("/login")
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Talimy</h1>
        <p className="mt-2 text-sm text-slate-600">School Management Platform</p>
      </div>
    </main>
  )
}
