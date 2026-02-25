import { createZodDto } from "nestjs-zod"
import {
  createPaymentSchema,
  type CreatePaymentInput,
  type UpdatePaymentInput,
  updatePaymentSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const CreatePaymentDtoBase = createZodDto(createPaymentSchema) as ZodDtoClass
const UpdatePaymentDtoBase = createZodDto(updatePaymentSchema) as ZodDtoClass

export class CreatePaymentDto extends CreatePaymentDtoBase {}
export interface CreatePaymentDto extends CreatePaymentInput {}

export class UpdatePaymentDto extends UpdatePaymentDtoBase {}
export interface UpdatePaymentDto extends UpdatePaymentInput {}
