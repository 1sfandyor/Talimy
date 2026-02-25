import { createZodDto } from "nestjs-zod"
import { updateUserRoleSchema, type UpdateUserRoleInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateUserRoleDtoBase = createZodDto(updateUserRoleSchema) as ZodDtoClass

export class UpdateUserRoleDto extends UpdateUserRoleDtoBase {}
export interface UpdateUserRoleDto extends UpdateUserRoleInput {}
