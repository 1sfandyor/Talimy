import { createZodDto } from "nestjs-zod"
import { gradeQuerySchema, type GradeQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const GradeQueryDtoBase = createZodDto(gradeQuerySchema) as ZodDtoClass

export class GradeQueryDto extends GradeQueryDtoBase {}
export interface GradeQueryDto extends GradeQueryInput {}
