import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().min(2),
  role: z.enum(["school_admin", "platform_admin"]).optional(),
  bootstrapKey: z.string().min(8).optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
