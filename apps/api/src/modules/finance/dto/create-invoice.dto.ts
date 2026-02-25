import { createZodDto } from "nestjs-zod"
import { createInvoiceSchema, type CreateInvoiceInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const CreateInvoiceDtoBase = createZodDto(createInvoiceSchema) as ZodDtoClass

export class CreateInvoiceDto extends CreateInvoiceDtoBase {}
export interface CreateInvoiceDto extends CreateInvoiceInput {}
