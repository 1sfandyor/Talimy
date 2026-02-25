import { createZodDto } from "nestjs-zod"
import { createStudentSchema, type CreateStudentInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateStudentDtoBase = createZodDto(createStudentSchema) as ZodDtoClass

export class CreateStudentDto extends CreateStudentDtoBase {}
export interface CreateStudentDto extends CreateStudentInput {}
