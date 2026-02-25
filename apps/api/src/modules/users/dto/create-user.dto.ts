import { createZodDto } from "nestjs-zod"
import { createUserSchema, type CreateUserInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateUserDtoBase = createZodDto(createUserSchema) as ZodDtoClass

export class CreateUserDto extends CreateUserDtoBase {}
export interface CreateUserDto extends CreateUserInput {}
