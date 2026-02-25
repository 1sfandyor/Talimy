import { z } from "zod"

export const uploadFolderSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^[a-zA-Z0-9/_-]+$/,
    "folder may contain only letters, numbers, slash, underscore, and hyphen"
  )
  .optional()

export const uploadMultipartSchema = z.object({
  tenantId: z.string().uuid(),
  folder: uploadFolderSchema,
})

export const uploadSignedUrlSchema = z.object({
  tenantId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  folder: uploadFolderSchema,
  expiresInSeconds: z.coerce.number().int().min(60).max(3600).optional(),
})

export const uploadDeleteSchema = z.object({
  key: z.string().trim().min(1).max(1024),
})

export type UploadMultipartInput = z.infer<typeof uploadMultipartSchema>
export type UploadSignedUrlInput = z.infer<typeof uploadSignedUrlSchema>
export type UploadDeleteInput = z.infer<typeof uploadDeleteSchema>
