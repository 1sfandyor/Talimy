import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@talimy/trpc"
import { trpcTransformer } from "@talimy/trpc/src/transformer"
import { headers } from "next/headers"

import { getWebOrigin } from "@/config/site"

export async function createServerTrpcClient() {
  const incomingHeaders = await headers()
  const forwardedHeaders = new Headers()

  for (const key of ["authorization", "cookie", "x-tenant-id", "x-tenant-slug", "x-locale"]) {
    const value = incomingHeaders.get(key)
    if (value) {
      forwardedHeaders.set(key, value)
    }
  }

  const requestHost = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host")
  const requestProto = incomingHeaders.get("x-forwarded-proto") ?? "https"
  const resolvedOrigin = requestHost ? `${requestProto}://${requestHost}` : getWebOrigin()

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${resolvedOrigin}/api/trpc`,
        transformer: trpcTransformer,
        headers: () => Object.fromEntries(forwardedHeaders.entries()),
      }),
    ],
  })
}
