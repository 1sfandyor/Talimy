import type { UploadDeleteInput, UploadSignedUrlInput } from "@talimy/shared"

import { webApiFetch } from "@/lib/api"

export type UploadSignedUrlResponse = {
  success: boolean
  data?: {
    url: string
    key: string
    publicUrl?: string | null
    headers?: Record<string, string>
  }
}

export function createUploadFormData(file: File): FormData {
  const formData = new FormData()
  formData.append("file", file)
  return formData
}

export function requestUploadSignedUrl(payload: UploadSignedUrlInput) {
  return webApiFetch<UploadSignedUrlResponse>("/upload?mode=signed-url", {
    method: "POST",
    body: payload,
  })
}

export function deleteUploadedFile(payload: UploadDeleteInput, tenantId: string) {
  return webApiFetch<{ success: boolean }>(`/upload?tenantId=${encodeURIComponent(tenantId)}`, {
    method: "DELETE",
    body: payload,
  })
}
