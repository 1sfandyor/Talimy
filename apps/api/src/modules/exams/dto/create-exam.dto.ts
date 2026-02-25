import { createZodDto } from "nestjs-zod"
import {
  createExamSchema,
  updateExamSchema,
  type CreateExamInput,
  type UpdateExamInput,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateExamDtoBase = createZodDto(createExamSchema) as ZodDtoClass
const UpdateExamDtoBase = createZodDto(updateExamSchema) as ZodDtoClass

export class CreateExamDto extends CreateExamDtoBase {}
export interface CreateExamDto extends CreateExamInput {}

export class UpdateExamDto extends UpdateExamDtoBase {}
export interface UpdateExamDto extends UpdateExamInput {}
