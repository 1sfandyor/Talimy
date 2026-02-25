import { createZodDto } from "nestjs-zod"
import {
  createScheduleSchema,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  updateScheduleSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const CreateScheduleDtoBase = createZodDto(createScheduleSchema) as ZodDtoClass
const UpdateScheduleDtoBase = createZodDto(updateScheduleSchema) as ZodDtoClass

export class CreateScheduleDto extends CreateScheduleDtoBase {}
export interface CreateScheduleDto extends CreateScheduleInput {}

export class UpdateScheduleDto extends UpdateScheduleDtoBase {}
export interface UpdateScheduleDto extends UpdateScheduleInput {}
