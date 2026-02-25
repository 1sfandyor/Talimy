import { createZodDto } from "nestjs-zod"
import { assignmentQuerySchema, type AssignmentQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const AssignmentQueryDtoBase = createZodDto(assignmentQuerySchema) as ZodDtoClass

export class AssignmentQueryDto extends AssignmentQueryDtoBase {}
export interface AssignmentQueryDto extends AssignmentQueryInput {}
