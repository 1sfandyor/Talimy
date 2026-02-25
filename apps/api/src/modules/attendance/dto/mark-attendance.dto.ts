import { createZodDto } from "nestjs-zod"
import { markAttendanceSchema, type MarkAttendanceInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const MarkAttendanceDtoBase = createZodDto(markAttendanceSchema) as ZodDtoClass

export class MarkAttendanceDto extends MarkAttendanceDtoBase {}
export interface MarkAttendanceDto extends MarkAttendanceInput {}
