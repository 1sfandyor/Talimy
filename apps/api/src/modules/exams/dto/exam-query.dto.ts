import { createZodDto } from "nestjs-zod"
import { examQuerySchema, type ExamQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ExamQueryDtoBase = createZodDto(examQuerySchema) as ZodDtoClass

export class ExamQueryDto extends ExamQueryDtoBase {}
export interface ExamQueryDto extends ExamQueryInput {}
