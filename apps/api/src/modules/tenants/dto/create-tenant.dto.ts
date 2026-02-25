import { createZodDto } from "nestjs-zod"
import { createTenantSchema, type CreateTenantInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateTenantDtoBase = createZodDto(createTenantSchema) as ZodDtoClass

export class CreateTenantDto extends CreateTenantDtoBase {}
export interface CreateTenantDto extends CreateTenantInput {}
