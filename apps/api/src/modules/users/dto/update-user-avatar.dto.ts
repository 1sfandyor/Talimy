import { createZodDto } from "nestjs-zod"
import { updateUserAvatarSchema, type UpdateUserAvatarInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateUserAvatarDtoBase = createZodDto(updateUserAvatarSchema) as ZodDtoClass

export class UpdateUserAvatarDto extends UpdateUserAvatarDtoBase {}
export interface UpdateUserAvatarDto extends UpdateUserAvatarInput {}
