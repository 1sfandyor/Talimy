import type { NextRequest } from "next/server"

import { proxyToBackendApi } from "@/lib/server/api-proxy"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return proxyToBackendApi(request, { targetPath: "/api/upload" })
}

export async function POST(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode")
  const targetPath = mode === "signed-url" ? "/api/upload/signed-url" : "/api/upload"

  return proxyToBackendApi(request, { targetPath })
}

export async function DELETE(request: NextRequest) {
  return proxyToBackendApi(request, { targetPath: "/api/upload" })
}
