import { createZodDto } from "nestjs-zod"
import { registerSchema, type RegisterInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const RegisterDtoBase = createZodDto(registerSchema) as ZodDtoClass

export class RegisterDto extends RegisterDtoBase {}
export interface RegisterDto extends RegisterInput {}
