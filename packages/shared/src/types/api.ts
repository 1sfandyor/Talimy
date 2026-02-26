export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ApiSuccessResponse<TData, TMeta = undefined> = TMeta extends undefined
  ? { success: true; data: TData }
  : { success: true; data: TData; meta: TMeta }

export type ApiErrorDetail = {
  field?: string
  message: string
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}
