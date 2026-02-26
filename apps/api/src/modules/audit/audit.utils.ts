import type { ExecutionContext } from "@nestjs/common"

export function auditResourceFromPath(url: string | undefined): string {
  const path = (url ?? "").split("?")[0] ?? ""
  const segments = path.split("/").filter(Boolean)
  if (segments[0] === "api") return segments[1] ?? "unknown"
  return segments[0] ?? "unknown"
}

export function shouldAuditMethod(method: string | undefined): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "").toUpperCase())
}

export function shouldSkipAudit(url: string | undefined): boolean {
  const path = (url ?? "").split("?")[0] ?? ""
  return path.startsWith("/api/audit-logs")
}

export function extractAuditRequest(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest<{
    method?: string
    url?: string
    body?: unknown
    ip?: string
    params?: Record<string, unknown>
    user?: { id?: string; tenantId?: string; roles?: string[] }
  }>()
  return req
}

export function sanitizeAuditData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value ?? null
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeAuditData(item))

  const source = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(source)) {
    if (["password", "refreshToken", "accessToken", "bootstrapKey"].includes(key)) continue
    result[key] = typeof raw === "object" ? sanitizeAuditData(raw) : raw
  }
  return result
}
