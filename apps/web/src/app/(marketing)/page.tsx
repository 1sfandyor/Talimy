import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@talimy/ui"

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
      <Card className="w-full max-w-xl">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Talimy
          </Badge>
          <CardTitle>School Management Platform</CardTitle>
          <CardDescription>Multi-tenant system for Uzbekistan schools.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Marketing pages are in progress. Core API and infra smoke checks are already active.
        </CardContent>
      </Card>
    </main>
  )
}
