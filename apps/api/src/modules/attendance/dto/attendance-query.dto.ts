import { createZodDto } from "nestjs-zod"
import { attendanceQuerySchema, type AttendanceQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const AttendanceQueryDtoBase = createZodDto(attendanceQuerySchema) as ZodDtoClass

export class AttendanceQueryDto extends AttendanceQueryDtoBase {}
export interface AttendanceQueryDto extends AttendanceQueryInput {}
