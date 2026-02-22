export type PermifyConfig = {
  grpcEndpoint: string | null
  schemaVersion: string | null
  enabled: boolean
  requestTimeoutMs: number
  insecure: boolean
}

const DEFAULT_TIMEOUT_MS = 3000
const DEFAULT_INSECURE = true

export function getPermifyConfig(): PermifyConfig {
  const grpcEndpoint = process.env.PERMIFY_GRPC_ENDPOINT?.trim() || null
  const schemaVersion = process.env.PERMIFY_SCHEMA_VERSION?.trim() || null
  const enabled = process.env.PERMIFY_ENABLED === "true"
  const requestTimeoutRaw = Number(process.env.PERMIFY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  const requestTimeoutMs =
    Number.isFinite(requestTimeoutRaw) && requestTimeoutRaw > 0
      ? requestTimeoutRaw
      : DEFAULT_TIMEOUT_MS
  const insecureRaw = process.env.PERMIFY_INSECURE
  const insecure =
    insecureRaw == null ? DEFAULT_INSECURE : insecureRaw.trim().toLowerCase() === "true"

  return {
    grpcEndpoint,
    schemaVersion,
    enabled,
    requestTimeoutMs,
    insecure,
  }
}
