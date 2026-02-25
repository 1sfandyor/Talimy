import { createZodDto } from "nestjs-zod"
import { enterExamResultsSchema, type EnterExamResultsInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const EnterExamResultsDtoBase = createZodDto(enterExamResultsSchema) as ZodDtoClass

export class EnterExamResultsDto extends EnterExamResultsDtoBase {}
export interface EnterExamResultsDto extends EnterExamResultsInput {}
