import { z } from "zod"

export const assignmentQuerySchema = z
  .object({
    tenantId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    classId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    dueDateFrom: z.string().date().optional(),
    dueDateTo: z.string().date().optional(),
  })
  .refine(
    (data) =>
      !data.dueDateFrom ||
      !data.dueDateTo ||
      new Date(data.dueDateFrom).getTime() <= new Date(data.dueDateTo).getTime(),
    {
      message: "dueDateFrom cannot be after dueDateTo",
      path: ["dueDateFrom"],
    }
  )

export const createAssignmentSchema = z.object({
  tenantId: z.string().uuid(),
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  dueDate: z.string().min(1),
  totalPoints: z.number().int().min(1).max(1000).default(100),
  fileUrl: z.string().url().max(500).optional(),
})

export const updateAssignmentSchema = z
  .object({
    teacherId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(10000).nullable().optional(),
    dueDate: z.string().min(1).optional(),
    totalPoints: z.number().int().min(1).max(1000).optional(),
    fileUrl: z.string().url().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

export const submitAssignmentSchema = z.object({
  studentId: z.string().uuid(),
  fileUrl: z.string().url().max(500).optional(),
})

export const gradeAssignmentSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(5000).optional(),
})

export type AssignmentQueryInput = z.infer<typeof assignmentQuerySchema>
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>
export type GradeAssignmentSubmissionInput = z.infer<typeof gradeAssignmentSubmissionSchema>
