import { createZodDto } from "nestjs-zod"
import { listStudentsQuerySchema, type ListStudentsQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ListStudentsQueryDtoBase = createZodDto(listStudentsQuerySchema) as ZodDtoClass

export class ListStudentsQueryDto extends ListStudentsQueryDtoBase {}
export interface ListStudentsQueryDto extends ListStudentsQueryInput {}
