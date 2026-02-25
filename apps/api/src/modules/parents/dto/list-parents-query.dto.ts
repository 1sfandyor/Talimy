import { createZodDto } from "nestjs-zod"
import { listParentsQuerySchema, type ListParentsQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ListParentsQueryDtoBase = createZodDto(listParentsQuerySchema) as ZodDtoClass

export class ListParentsQueryDto extends ListParentsQueryDtoBase {}
export interface ListParentsQueryDto extends ListParentsQueryInput {}
