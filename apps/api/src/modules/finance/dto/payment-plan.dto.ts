import { createZodDto } from "nestjs-zod"
import {
  createPaymentPlanSchema,
  type CreatePaymentPlanInput,
  type UpdatePaymentPlanInput,
  updatePaymentPlanSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const CreatePaymentPlanDtoBase = createZodDto(createPaymentPlanSchema) as ZodDtoClass
const UpdatePaymentPlanDtoBase = createZodDto(updatePaymentPlanSchema) as ZodDtoClass

export class CreatePaymentPlanDto extends CreatePaymentPlanDtoBase {}
export interface CreatePaymentPlanDto extends CreatePaymentPlanInput {}

export class UpdatePaymentPlanDto extends UpdatePaymentPlanDtoBase {}
export interface UpdatePaymentPlanDto extends UpdatePaymentPlanInput {}
