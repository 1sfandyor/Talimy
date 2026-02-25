import { createZodDto } from "nestjs-zod"
import {
  createEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
  updateEventSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateEventDtoBase = createZodDto(createEventSchema) as ZodDtoClass
const UpdateEventDtoBase = createZodDto(updateEventSchema) as ZodDtoClass

export class CreateEventDto extends CreateEventDtoBase {}
export interface CreateEventDto extends CreateEventInput {}

export class UpdateEventDto extends UpdateEventDtoBase {}
export interface UpdateEventDto extends UpdateEventInput {}
