import { createZodDto } from "nestjs-zod"
import { listClassesQuerySchema, type ListClassesQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ListClassesQueryDtoBase = createZodDto(listClassesQuerySchema) as ZodDtoClass

export class ListClassesQueryDto extends ListClassesQueryDtoBase {}
export interface ListClassesQueryDto extends ListClassesQueryInput {}
