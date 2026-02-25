import { createZodDto } from "nestjs-zod"
import { noticesQuerySchema, type NoticesQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const NoticeQueryDtoBase = createZodDto(noticesQuerySchema) as ZodDtoClass

export class NoticeQueryDto extends NoticeQueryDtoBase {}
export interface NoticeQueryDto extends NoticesQueryInput {}
