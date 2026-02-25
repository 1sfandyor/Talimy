import { createZodDto } from "nestjs-zod"
import {
  gradeAssignmentSubmissionSchema,
  submitAssignmentSchema,
  type GradeAssignmentSubmissionInput,
  type SubmitAssignmentInput,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const SubmitAssignmentDtoBase = createZodDto(submitAssignmentSchema) as ZodDtoClass
const GradeAssignmentSubmissionDtoBase = createZodDto(
  gradeAssignmentSubmissionSchema
) as ZodDtoClass

export class SubmitAssignmentDto extends SubmitAssignmentDtoBase {}
export interface SubmitAssignmentDto extends SubmitAssignmentInput {}

export class GradeAssignmentSubmissionDto extends GradeAssignmentSubmissionDtoBase {}
export interface GradeAssignmentSubmissionDto extends GradeAssignmentSubmissionInput {}
