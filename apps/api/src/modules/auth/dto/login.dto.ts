import { createZodDto } from "nestjs-zod"
import { loginSchema, type LoginInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const LoginDtoBase = createZodDto(loginSchema) as ZodDtoClass

export class LoginDto extends LoginDtoBase {}
export interface LoginDto extends LoginInput {}
