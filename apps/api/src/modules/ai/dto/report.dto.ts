import { createZodDto } from "nestjs-zod"
import {
  aiInsightsQuerySchema,
  aiReportGenerateSchema,
  type AiInsightsQueryInput,
  type AiReportGenerateInput,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const AiInsightsQueryDtoBase = createZodDto(aiInsightsQuerySchema) as ZodDtoClass
const AiReportGenerateDtoBase = createZodDto(aiReportGenerateSchema) as ZodDtoClass

export class AiInsightsQueryDto extends AiInsightsQueryDtoBase {}
export interface AiInsightsQueryDto extends AiInsightsQueryInput {}

export class AiReportGenerateDto extends AiReportGenerateDtoBase {}
export interface AiReportGenerateDto extends AiReportGenerateInput {}
