import { randomUUID } from "node:crypto"

import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common"
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import type { UploadDeleteDto, UploadMultipartDto, UploadSignedUrlDto } from "./dto/upload.dto"
import type {
  SignedUploadUrlResponse,
  UploadedObjectResponse,
  UploadFileInput,
} from "./upload.types"

@Injectable()
export class UploadService {
  private readonly maxFileSizeBytes = Number(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024
  )
  private readonly allowedMimeTypes = new Set(
    (
      process.env.UPLOAD_ALLOWED_MIME_TYPES ??
      "image/png,image/jpeg,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )

  private s3Client: S3Client | null = null

  async uploadFile(
    payload: UploadMultipartDto,
    file: UploadFileInput
  ): Promise<UploadedObjectResponse> {
    this.assertFileAllowed(file)
    const key = this.buildObjectKey(payload.tenantId, payload.folder, file.originalname)

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      )
    } catch (error) {
      throw new InternalServerErrorException(
        `R2 upload failed: ${error instanceof Error ? error.message : "unknown error"}`
      )
    }

    return {
      key,
      fileName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      url: this.getPublicUrl(key),
    }
  }

  async getSignedUrlForUpload(payload: UploadSignedUrlDto): Promise<SignedUploadUrlResponse> {
    this.assertMimeAllowed(payload.contentType)
    const key = this.buildObjectKey(payload.tenantId, payload.folder, payload.fileName)
    const expiresInSeconds = payload.expiresInSeconds ?? 600

    let signedUrl: string
    try {
      signedUrl = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: payload.contentType,
        }),
        { expiresIn: expiresInSeconds }
      )
    } catch (error) {
      throw new InternalServerErrorException(
        `R2 signed URL generation failed: ${error instanceof Error ? error.message : "unknown error"}`
      )
    }

    return {
      key,
      method: "PUT",
      expiresInSeconds,
      signedUrl,
      url: this.getPublicUrl(key),
    }
  }

  async deleteFile(tenantId: string, payload: UploadDeleteDto): Promise<{ success: true }> {
    this.assertKeyInTenant(tenantId, payload.key)

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: payload.key,
        })
      )
    } catch (error) {
      throw new InternalServerErrorException(
        `R2 delete failed: ${error instanceof Error ? error.message : "unknown error"}`
      )
    }

    return { success: true }
  }

  private get client(): S3Client {
    if (this.s3Client) {
      return this.s3Client
    }

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: this.r2Endpoint,
      credentials: {
        accessKeyId: this.requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: this.requireEnv("R2_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
    })

    return this.s3Client
  }

  private get bucketName(): string {
    return this.requireEnv("R2_BUCKET_NAME")
  }

  private get r2Endpoint(): string {
    const explicit = process.env.R2_ENDPOINT?.trim()
    if (explicit) return explicit

    const accountId = this.requireEnv("R2_ACCOUNT_ID")
    return `https://${accountId}.r2.cloudflarestorage.com`
  }

  private buildObjectKey(
    tenantId: string,
    folder: string | undefined,
    originalName: string
  ): string {
    const safeFolder = folder ? this.sanitizeFolder(folder) : "misc"
    const safeName = this.sanitizeFileName(originalName)
    return `uploads/${tenantId}/${safeFolder}/${randomUUID()}-${safeName}`
  }

  private sanitizeFolder(folder: string): string {
    return folder
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("/")
  }

  private sanitizeFileName(fileName: string): string {
    const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-")
    return normalized.length > 0 ? normalized.slice(-180) : "file"
  }

  private assertFileAllowed(file: UploadFileInput): void {
    if (!file.buffer?.length) {
      throw new BadRequestException("Uploaded file is empty")
    }
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(`File size exceeds limit (${this.maxFileSizeBytes} bytes)`)
    }
    this.assertMimeAllowed(file.mimetype)
  }

  private assertMimeAllowed(mimeType: string): void {
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}`)
    }
  }

  private assertKeyInTenant(tenantId: string, key: string): void {
    const normalized = key.replace(/^\/+/, "")
    const prefix = `uploads/${tenantId}/`
    if (!normalized.startsWith(prefix)) {
      throw new BadRequestException("File key does not belong to tenant upload scope")
    }
  }

  private getPublicUrl(key: string): string | null {
    const base = process.env.R2_PUBLIC_BASE_URL?.trim()
    if (!base) {
      return null
    }
    return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`
  }

  private requireEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured`)
    }
    return value
  }
}
