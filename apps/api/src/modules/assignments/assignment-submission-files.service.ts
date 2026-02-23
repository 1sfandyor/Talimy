import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"

import { Injectable } from "@nestjs/common"

type AssignmentSubmissionUploadFile = {
  buffer: Buffer
  originalname?: string
}

@Injectable()
export class AssignmentSubmissionFilesService {
  async saveSubmissionFile(input: {
    tenantId: string
    assignmentId: string
    studentId: string
    file: AssignmentSubmissionUploadFile
  }): Promise<string> {
    const extension = this.getSafeExtension(input.file.originalname)
    const fileName = `${randomUUID()}${extension}`
    const relativePath = [
      "uploads",
      "assignments",
      "submissions",
      input.tenantId,
      input.assignmentId,
      input.studentId,
      fileName,
    ]
    const absolutePath = join(process.cwd(), ...relativePath)

    await mkdir(join(process.cwd(), ...relativePath.slice(0, -1)), { recursive: true })
    await writeFile(absolutePath, input.file.buffer)

    return this.buildPublicFileUrl(relativePath)
  }

  private getSafeExtension(originalName?: string): string {
    const rawExtension = extname(originalName ?? "").toLowerCase()
    const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"])

    return allowedExtensions.has(rawExtension) ? rawExtension : ""
  }

  private buildPublicFileUrl(relativePath: string[]): string {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3001").replace(
      /\/+$/,
      ""
    )

    return `${baseUrl}/${relativePath.join("/")}`
  }
}
