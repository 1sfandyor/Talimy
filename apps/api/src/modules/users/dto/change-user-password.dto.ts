import { createZodDto } from "nestjs-zod"
import { changeUserPasswordSchema, type ChangeUserPasswordInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ChangeUserPasswordDtoBase = createZodDto(changeUserPasswordSchema) as ZodDtoClass

export class ChangeUserPasswordDto extends ChangeUserPasswordDtoBase {}
export interface ChangeUserPasswordDto extends ChangeUserPasswordInput {}
