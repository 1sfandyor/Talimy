import { z } from "zod"

export const listStudentsQuerySchema = z
  .object({
    tenantId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    classId: z.string().uuid().optional(),
    gender: z.enum(["male", "female"]).optional(),
    status: z.enum(["active", "inactive", "graduated", "transferred"]).optional(),
    enrollmentDateFrom: z.string().date().optional(),
    enrollmentDateTo: z.string().date().optional(),
  })
  .refine(
    (data) =>
      !data.enrollmentDateFrom ||
      !data.enrollmentDateTo ||
      new Date(data.enrollmentDateFrom) <= new Date(data.enrollmentDateTo),
    {
      message: "enrollmentDateFrom must be before or equal to enrollmentDateTo",
      path: ["enrollmentDateFrom"],
    }
  )

export const createStudentSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  studentId: z.string().min(2),
  gender: z.enum(["male", "female"]),
  enrollmentDate: z.string().date(),
  dateOfBirth: z.string().date().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive", "graduated", "transferred"]).optional(),
  fullName: z.string().min(2),
})

export const updateStudentSchema = z.object({
  classId: z.string().uuid().optional(),
  studentId: z.string().min(2).optional(),
  gender: z.enum(["male", "female"]).optional(),
  enrollmentDate: z.string().date().optional(),
  dateOfBirth: z.string().date().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive", "graduated", "transferred"]).optional(),
  fullName: z.string().min(2).optional(),
})

export type ListStudentsQueryInput = z.infer<typeof listStudentsQuerySchema>
export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
