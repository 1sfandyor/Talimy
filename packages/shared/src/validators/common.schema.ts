import { z } from "zod"

export const uuidStringSchema = z.string().uuid("Invalid UUID format")

export const uuidParamSchema = z.object({
  id: uuidStringSchema,
})

export type UuidParamInput = z.infer<typeof uuidParamSchema>
