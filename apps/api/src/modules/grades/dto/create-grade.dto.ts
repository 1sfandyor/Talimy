import { createZodDto } from "nestjs-zod"
import {
  createGradeScaleSchema,
  createGradeSchema,
  updateGradeScaleSchema,
  type CreateGradeInput,
  type CreateGradeScaleInput,
  type UpdateGradeScaleInput,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const CreateGradeDtoBase = createZodDto(createGradeSchema) as ZodDtoClass
const CreateGradeScaleDtoBase = createZodDto(createGradeScaleSchema) as ZodDtoClass
const UpdateGradeScaleDtoBase = createZodDto(updateGradeScaleSchema) as ZodDtoClass

export class CreateGradeDto extends CreateGradeDtoBase {}
export interface CreateGradeDto extends CreateGradeInput {}

export class CreateGradeScaleDto extends CreateGradeScaleDtoBase {}
export interface CreateGradeScaleDto extends CreateGradeScaleInput {}

export class UpdateGradeScaleDto extends UpdateGradeScaleDtoBase {}
export interface UpdateGradeScaleDto extends UpdateGradeScaleInput {}
