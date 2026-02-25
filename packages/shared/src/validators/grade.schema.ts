import { z } from "zod"

export const gradeQuerySchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
})

export const createGradeSchema = z.object({
  tenantId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0).max(100),
        grade: z.string().max(10).optional(),
        comment: z.string().max(1000).optional(),
      })
    )
    .min(1),
})

export const createGradeScaleSchema = z
  .object({
    tenantId: z.string().uuid(),
    name: z.string().min(1).max(100),
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    grade: z.string().min(1).max(10),
    gpa: z.number().min(0).max(5).nullable().optional(),
  })
  .refine((data) => data.minScore <= data.maxScore, {
    message: "minScore cannot be greater than maxScore",
    path: ["minScore"],
  })

export const updateGradeScaleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    minScore: z.number().min(0).max(100).optional(),
    maxScore: z.number().min(0).max(100).optional(),
    grade: z.string().min(1).max(10).optional(),
    gpa: z.number().min(0).max(5).nullable().optional(),
  })
  .refine(
    (data) =>
      typeof data.minScore !== "number" ||
      typeof data.maxScore !== "number" ||
      data.minScore <= data.maxScore,
    {
      message: "minScore cannot be greater than maxScore",
      path: ["minScore"],
    }
  )

export type GradeQueryInput = z.infer<typeof gradeQuerySchema>
export type CreateGradeInput = z.infer<typeof createGradeSchema>
export type CreateGradeScaleInput = z.infer<typeof createGradeScaleSchema>
export type UpdateGradeScaleInput = z.infer<typeof updateGradeScaleSchema>
