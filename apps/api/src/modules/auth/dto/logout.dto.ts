import { createZodDto } from "nestjs-zod"
import { logoutSchema, type LogoutInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const LogoutDtoBase = createZodDto(logoutSchema) as ZodDtoClass

export class LogoutDto extends LogoutDtoBase {}
export interface LogoutDto extends LogoutInput {}
