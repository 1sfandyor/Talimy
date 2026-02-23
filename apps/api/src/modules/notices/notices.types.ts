export type NoticeTargetRole = "all" | "teachers" | "students" | "parents"
export type NoticeAudienceRole = "teachers" | "students" | "parents"
export type NoticePriority = "low" | "medium" | "high" | "urgent"

export type NoticeView = {
  id: string
  tenantId: string
  title: string
  content: string
  targetRole: NoticeTargetRole
  priority: NoticePriority
  createdBy: string | null
  publishDate: string
  expiryDate: string | null
  createdAt: string
  updatedAt: string
}

export type NoticeListResponse = {
  data: NoticeView[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

