import type { NextRequest } from "next/server"

import { proxyToBackendApi } from "@/lib/server/api-proxy"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return proxyToBackendApi(request, {
    targetPath: toBackendTrpcPath(request),
  })
}

export async function POST(request: NextRequest) {
  return proxyToBackendApi(request, {
    targetPath: toBackendTrpcPath(request),
  })
}

function toBackendTrpcPath(request: NextRequest): string {
  const basePath = request.nextUrl.pathname.replace(/^\/api\/trpc/, "")
  const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`
  return `/api/trpc${normalized}`
}
