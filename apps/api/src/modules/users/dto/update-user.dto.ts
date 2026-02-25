import { createZodDto } from "nestjs-zod"
import { updateUserSchema, type UpdateUserInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateUserDtoBase = createZodDto(updateUserSchema) as ZodDtoClass

export class UpdateUserDto extends UpdateUserDtoBase {}
export interface UpdateUserDto extends UpdateUserInput {}
