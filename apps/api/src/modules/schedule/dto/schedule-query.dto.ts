import { createZodDto } from "nestjs-zod"
import { scheduleQuerySchema, type ScheduleQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const ScheduleQueryDtoBase = createZodDto(scheduleQuerySchema) as ZodDtoClass

export class ScheduleQueryDto extends ScheduleQueryDtoBase {}
export interface ScheduleQueryDto extends ScheduleQueryInput {}
