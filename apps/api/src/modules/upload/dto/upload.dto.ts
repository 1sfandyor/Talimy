import { createZodDto } from "nestjs-zod"
import {
  type UploadDeleteInput,
  type UploadMultipartInput,
  type UploadSignedUrlInput,
  uploadDeleteSchema,
  uploadMultipartSchema,
  uploadSignedUrlSchema,
} from "@talimy/shared"

type ZodDtoClass = abstract new (...args: never[]) => object
const UploadMultipartDtoBase = createZodDto(uploadMultipartSchema) as ZodDtoClass
const UploadSignedUrlDtoBase = createZodDto(uploadSignedUrlSchema) as ZodDtoClass
const UploadDeleteDtoBase = createZodDto(uploadDeleteSchema) as ZodDtoClass

export class UploadMultipartDto extends UploadMultipartDtoBase {}
export interface UploadMultipartDto extends UploadMultipartInput {}

export class UploadSignedUrlDto extends UploadSignedUrlDtoBase {}
export interface UploadSignedUrlDto extends UploadSignedUrlInput {}

export class UploadDeleteDto extends UploadDeleteDtoBase {}
export interface UploadDeleteDto extends UploadDeleteInput {}
