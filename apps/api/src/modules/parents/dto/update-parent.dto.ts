import { createZodDto } from "nestjs-zod"
import { updateParentSchema, type UpdateParentInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateParentDtoBase = createZodDto(updateParentSchema) as ZodDtoClass

export class UpdateParentDto extends UpdateParentDtoBase {}
export interface UpdateParentDto extends UpdateParentInput {}
