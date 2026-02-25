import {
  Body,
  Controller,
  Delete,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import {
  uploadDeleteSchema,
  uploadMultipartSchema,
  uploadSignedUrlSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import type { UploadDeleteDto, UploadMultipartDto, UploadSignedUrlDto } from "./dto/upload.dto"
import { UploadService } from "./upload.service"
import type { UploadFileInput } from "./upload.types"

type MultipartUploadedFile = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

@Controller("upload")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024),
      },
    })
  )
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024),
        })
        .build({ fileIsRequired: true })
    )
    file: MultipartUploadedFile,
    @Body(new ZodValidationPipe(uploadMultipartSchema)) bodyInput: unknown
  ) {
    const body = bodyInput as UploadMultipartDto
    return this.uploadService.uploadFile(body, file as UploadFileInput)
  }

  @Post("signed-url")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  signedUrl(@Body(new ZodValidationPipe(uploadSignedUrlSchema)) bodyInput: unknown) {
    const body = bodyInput as UploadSignedUrlDto
    return this.uploadService.getSignedUrlForUpload(body)
  }

  @Delete()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(uploadDeleteSchema)) bodyInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const body = bodyInput as UploadDeleteDto
    return this.uploadService.deleteFile(query.tenantId, body)
  }
}
