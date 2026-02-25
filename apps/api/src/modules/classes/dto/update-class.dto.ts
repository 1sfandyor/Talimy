import { createZodDto } from "nestjs-zod"
import { updateClassSchema, type UpdateClassInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateClassDtoBase = createZodDto(updateClassSchema) as ZodDtoClass

export class UpdateClassDto extends UpdateClassDtoBase {}
export interface UpdateClassDto extends UpdateClassInput {}
