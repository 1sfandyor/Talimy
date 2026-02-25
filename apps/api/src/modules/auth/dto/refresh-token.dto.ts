import { createZodDto } from "nestjs-zod"
import { refreshTokenSchema, type RefreshTokenInput } from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const RefreshTokenDtoBase = createZodDto(refreshTokenSchema) as ZodDtoClass

export class RefreshTokenDto extends RefreshTokenDtoBase {}
export interface RefreshTokenDto extends RefreshTokenInput {}
