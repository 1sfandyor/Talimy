import { createZodDto } from "nestjs-zod"
import { updateTeacherSchema, type UpdateTeacherInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateTeacherDtoBase = createZodDto(updateTeacherSchema) as ZodDtoClass

export class UpdateTeacherDto extends UpdateTeacherDtoBase {}
export interface UpdateTeacherDto extends UpdateTeacherInput {}
