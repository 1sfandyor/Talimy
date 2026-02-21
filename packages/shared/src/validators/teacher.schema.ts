import { z } from "zod"

export const listTeachersQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  gender: z.enum(["male", "female"]).optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
})

export const createTeacherSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  employeeId: z.string().min(2),
  gender: z.enum(["male", "female"]),
  joinDate: z.string().date(),
  dateOfBirth: z.string().date().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  salary: z.number().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
})

export const updateTeacherSchema = z.object({
  tenantId: z.string().uuid(),
  employeeId: z.string().min(2).optional(),
  gender: z.enum(["male", "female"]).optional(),
  joinDate: z.string().date().optional(),
  dateOfBirth: z.string().date().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  salary: z.number().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).optional(),
})

export type ListTeachersQueryInput = z.infer<typeof listTeachersQuerySchema>
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>
