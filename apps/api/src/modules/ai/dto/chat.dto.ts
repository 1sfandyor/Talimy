import { createZodDto } from "nestjs-zod"
import { aiChatSchema, type AiChatInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const AiChatDtoBase = createZodDto(aiChatSchema) as ZodDtoClass

export class AiChatDto extends AiChatDtoBase {}
export interface AiChatDto extends AiChatInput {}
