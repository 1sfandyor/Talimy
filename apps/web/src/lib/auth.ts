const ACCESS_TOKEN_KEY = "talimy.accessToken"
const REFRESH_TOKEN_KEY = "talimy.refreshToken"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function getStoredAuthTokens(): AuthTokens | null {
  if (!canUseStorage()) return null

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!accessToken || !refreshToken) {
    return null
  }

  return { accessToken, refreshToken }
}

export function setStoredAuthTokens(tokens: AuthTokens): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearStoredAuthTokens(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
