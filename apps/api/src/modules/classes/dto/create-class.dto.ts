import { createZodDto } from "nestjs-zod"
import { createClassSchema, type CreateClassInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateClassDtoBase = createZodDto(createClassSchema) as ZodDtoClass

export class CreateClassDto extends CreateClassDtoBase {}
export interface CreateClassDto extends CreateClassInput {}
