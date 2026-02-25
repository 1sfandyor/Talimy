import { createZodDto } from "nestjs-zod"
import { listUsersQuerySchema, type ListUsersQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ListUsersQueryDtoBase = createZodDto(listUsersQuerySchema) as ZodDtoClass

export class ListUsersQueryDto extends ListUsersQueryDtoBase {}
export interface ListUsersQueryDto extends ListUsersQueryInput {}
