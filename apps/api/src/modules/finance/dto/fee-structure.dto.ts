import { createZodDto } from "nestjs-zod"
import {
  createFeeStructureSchema,
  type CreateFeeStructureInput,
  type UpdateFeeStructureInput,
  updateFeeStructureSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const CreateFeeStructureDtoBase = createZodDto(createFeeStructureSchema) as ZodDtoClass
const UpdateFeeStructureDtoBase = createZodDto(updateFeeStructureSchema) as ZodDtoClass

export class CreateFeeStructureDto extends CreateFeeStructureDtoBase {}
export interface CreateFeeStructureDto extends CreateFeeStructureInput {}

export class UpdateFeeStructureDto extends UpdateFeeStructureDtoBase {}
export interface UpdateFeeStructureDto extends UpdateFeeStructureInput {}
