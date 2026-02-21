import { z } from "zod"

const userRoleSchema = z.enum(["platform_admin", "school_admin", "teacher", "student", "parent"])

export const userTenantQuerySchema = z.object({
  tenantId: z.string().uuid(),
})

export const listUsersQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  role: userRoleSchema.optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const createUserSchema = z.object({
  tenantId: z.string().uuid(),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
})

export const updateUserSchema = z.object({
  tenantId: z.string().uuid(),
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>
