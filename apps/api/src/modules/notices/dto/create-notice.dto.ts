import { createZodDto } from "nestjs-zod"
import {
  createNoticeSchema,
  type CreateNoticeInput,
  type UpdateNoticeInput,
  updateNoticeSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateNoticeDtoBase = createZodDto(createNoticeSchema) as ZodDtoClass
const UpdateNoticeDtoBase = createZodDto(updateNoticeSchema) as ZodDtoClass

export class CreateNoticeDto extends CreateNoticeDtoBase {}
export interface CreateNoticeDto extends CreateNoticeInput {}

export class UpdateNoticeDto extends UpdateNoticeDtoBase {}
export interface UpdateNoticeDto extends UpdateNoticeInput {}
