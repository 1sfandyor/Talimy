import { createZodDto } from "nestjs-zod"
import { listTenantsQuerySchema, type ListTenantsQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ListTenantsQueryDtoBase = createZodDto(listTenantsQuerySchema) as ZodDtoClass

export class ListTenantsQueryDto extends ListTenantsQueryDtoBase {}
export interface ListTenantsQueryDto extends ListTenantsQueryInput {}
