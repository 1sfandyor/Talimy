import { createZodDto } from "nestjs-zod"
import { createParentSchema, type CreateParentInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateParentDtoBase = createZodDto(createParentSchema) as ZodDtoClass

export class CreateParentDto extends CreateParentDtoBase {}
export interface CreateParentDto extends CreateParentInput {}
