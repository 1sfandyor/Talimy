export type AuthConfig = {
  accessTokenTtlSec: number
  refreshTokenTtlSec: number
  jwtAccessSecret: string
  jwtRefreshSecret: string
}

const DEFAULT_ACCESS_TTL_SEC = 15 * 60
const DEFAULT_REFRESH_TTL_SEC = 7 * 24 * 60 * 60

export function getAuthConfig(): AuthConfig {
  const accessTokenTtlSec = Number(process.env.JWT_ACCESS_TTL_SEC ?? DEFAULT_ACCESS_TTL_SEC)
  const refreshTokenTtlSec = Number(process.env.JWT_REFRESH_TTL_SEC ?? DEFAULT_REFRESH_TTL_SEC)

  return {
    accessTokenTtlSec,
    refreshTokenTtlSec,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  }
}
