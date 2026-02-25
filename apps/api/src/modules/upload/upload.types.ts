export type UploadFileInput = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

export type UploadedObjectResponse = {
  key: string
  fileName: string
  contentType: string
  size: number
  url: string | null
}

export type SignedUploadUrlResponse = {
  key: string
  method: "PUT"
  expiresInSeconds: number
  signedUrl: string
  url: string | null
}
