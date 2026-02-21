import { headers } from "next/headers"

export default async function MarketingHomePage() {
  const requestHeaders = await headers()
  const host = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  ).toLowerCase()
  const isPlatformDomain = host.startsWith("platform.")

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          {isPlatformDomain ? "Talimy Platform" : "Talimy"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isPlatformDomain ? "Platform Admin Console" : "School Management Platform"}
        </p>
      </div>
    </main>
  )
}
