export type CalendarEventType = "academic" | "exam" | "holiday" | "sports" | "other"

export type CalendarEventView = {
  id: string
  tenantId: string
  title: string
  description: string | null
  startDate: string
  endDate: string
  location: string | null
  type: CalendarEventType
  createdAt: string
  updatedAt: string
}

export type CalendarEventsListResponse = {
  data: CalendarEventView[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}
