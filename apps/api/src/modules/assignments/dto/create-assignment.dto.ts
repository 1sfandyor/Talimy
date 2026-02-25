import { createZodDto } from "nestjs-zod"
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateAssignmentDtoBase = createZodDto(createAssignmentSchema) as ZodDtoClass
const UpdateAssignmentDtoBase = createZodDto(updateAssignmentSchema) as ZodDtoClass

export class CreateAssignmentDto extends CreateAssignmentDtoBase {}
export interface CreateAssignmentDto extends CreateAssignmentInput {}

export class UpdateAssignmentDto extends UpdateAssignmentDtoBase {}
export interface UpdateAssignmentDto extends UpdateAssignmentInput {}
