import { createZodDto } from "nestjs-zod"
import { eventsQuerySchema, type EventsQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const EventQueryDtoBase = createZodDto(eventsQuerySchema) as ZodDtoClass

export class EventQueryDto extends EventQueryDtoBase {}
export interface EventQueryDto extends EventsQueryInput {}
