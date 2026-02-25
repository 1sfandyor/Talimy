import { createZodDto } from "nestjs-zod"
import { updateTenantSchema, type UpdateTenantInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateTenantDtoBase = createZodDto(updateTenantSchema) as ZodDtoClass

export class UpdateTenantDto extends UpdateTenantDtoBase {}
export interface UpdateTenantDto extends UpdateTenantInput {}
