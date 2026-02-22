export type PermifyConfig = {
  endpoint: string | null
  schemaVersion: string | null
  enabled: boolean
  requestTimeoutMs: number
}

const DEFAULT_TIMEOUT_MS = 3000

export function getPermifyConfig(): PermifyConfig {
  const endpoint = process.env.PERMIFY_PDP_URL?.trim() || null
  const schemaVersion = process.env.PERMIFY_SCHEMA_VERSION?.trim() || null
  const enabled = process.env.PERMIFY_ENABLED === "true"
  const requestTimeoutMs = Number(process.env.PERMIFY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)

  return {
    endpoint,
    schemaVersion,
    enabled,
    requestTimeoutMs,
  }
}
