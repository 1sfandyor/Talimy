import { createZodDto } from "nestjs-zod"
import { updateTenantBillingSchema, type UpdateTenantBillingInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UpdateTenantBillingDtoBase = createZodDto(updateTenantBillingSchema) as ZodDtoClass

export class UpdateTenantBillingDto extends UpdateTenantBillingDtoBase {}
export interface UpdateTenantBillingDto extends UpdateTenantBillingInput {}
