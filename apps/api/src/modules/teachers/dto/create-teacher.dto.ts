import { createZodDto } from "nestjs-zod"
import { createTeacherSchema, type CreateTeacherInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateTeacherDtoBase = createZodDto(createTeacherSchema) as ZodDtoClass

export class CreateTeacherDto extends CreateTeacherDtoBase {}
export interface CreateTeacherDto extends CreateTeacherInput {}
