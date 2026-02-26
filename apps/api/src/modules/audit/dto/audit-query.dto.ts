import { createZodDto } from "nestjs-zod"
import { auditLogsQuerySchema, type AuditLogsQueryInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object

const AuditLogsQueryDtoBase = createZodDto(auditLogsQuerySchema) as ZodDtoClass

export class AuditLogsQueryDto extends AuditLogsQueryDtoBase {}
export interface AuditLogsQueryDto extends AuditLogsQueryInput {}
