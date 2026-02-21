import { z } from "zod"

export const listClassesQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  grade: z.string().optional(),
  section: z.string().optional(),
  academicYearId: z.string().uuid().optional(),
})

export const createClassSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2),
  grade: z.string().min(1),
  section: z.string().optional(),
  capacity: z.number().int().min(1).max(200),
  academicYearId: z.string().uuid(),
})

export const updateClassSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).optional(),
  grade: z.string().min(1).optional(),
  section: z.string().optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  academicYearId: z.string().uuid().optional(),
})

export type ListClassesQueryInput = z.infer<typeof listClassesQuerySchema>
export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
