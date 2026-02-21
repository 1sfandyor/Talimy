export type ApiErrorDetail = {
  field?: string
  message: string
}

export type ApiError = {
  code: string
  message: string
  details?: ApiErrorDetail[]
}

export type ApiMeta = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}
