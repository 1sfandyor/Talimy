export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type TokenPayload = {
  sub: string
  email: string
  tenantId: string
  roles: string[]
  genderScope: "male" | "female" | "all"
  type: "access" | "refresh"
  jti: string
  iat: number
  exp: number
}

export type StoredUser = {
  id: string
  fullName: string
  email: string
  tenantId: string
  passwordHash: string
  roles: string[]
  genderScope: "male" | "female" | "all"
}

export type AuthIdentity = Omit<TokenPayload, "iat" | "exp" | "jti" | "type">
