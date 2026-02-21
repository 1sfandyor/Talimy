import { z } from "zod"

export const listParentsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  studentId: z.string().uuid().optional(),
})

export const createParentSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  relationship: z.string().min(2).optional(),
  studentIds: z.array(z.string().uuid()).optional(),
})

export const updateParentSchema = z.object({
  tenantId: z.string().uuid(),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  relationship: z.string().min(2).optional(),
})

export type ListParentsQueryInput = z.infer<typeof listParentsQuerySchema>
export type CreateParentInput = z.infer<typeof createParentSchema>
export type UpdateParentInput = z.infer<typeof updateParentSchema>
