import { z } from "zod"

const examTypeSchema = z.enum(["midterm", "final", "quiz", "custom"])

export const examQuerySchema = z
  .object({
    tenantId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    classId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    examId: z.string().uuid().optional(),
    type: examTypeSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.dateFrom ||
      !data.dateTo ||
      new Date(data.dateFrom).getTime() <= new Date(data.dateTo).getTime(),
    {
      message: "dateFrom cannot be after dateTo",
      path: ["dateFrom"],
    }
  )

export const createExamSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(150),
  type: examTypeSchema,
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.string().min(1),
  totalMarks: z.number().int().min(1),
  duration: z.number().int().min(1),
})

export const updateExamSchema = z
  .object({
    tenantId: z.string().uuid(),
    name: z.string().min(1).max(150).optional(),
    type: examTypeSchema.optional(),
    subjectId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    date: z.string().min(1).optional(),
    totalMarks: z.number().int().min(1).optional(),
    duration: z.number().int().min(1).optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "tenantId"), {
    message: "At least one field must be provided",
  })

export const enterExamResultsSchema = z.object({
  tenantId: z.string().uuid(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().min(0),
        grade: z.string().max(10).optional(),
        rank: z.string().max(20).optional(),
      })
    )
    .min(1),
})

export type ExamQueryInput = z.infer<typeof examQuerySchema>
export type CreateExamInput = z.infer<typeof createExamSchema>
export type UpdateExamInput = z.infer<typeof updateExamSchema>
export type EnterExamResultsInput = z.infer<typeof enterExamResultsSchema>
