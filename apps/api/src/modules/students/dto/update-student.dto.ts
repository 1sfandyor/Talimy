import { createZodDto } from "nestjs-zod"
import { updateStudentSchema, type UpdateStudentInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateStudentDtoBase = createZodDto(updateStudentSchema) as ZodDtoClass

export class UpdateStudentDto extends UpdateStudentDtoBase {}
export interface UpdateStudentDto extends UpdateStudentInput {}
