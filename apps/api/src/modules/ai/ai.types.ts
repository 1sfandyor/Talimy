export type AiActor = {
  id: string
  tenantId?: string
  roles?: string[]
}

export type OpenRouterMessage = {
  role: "user" | "assistant"
  content: string
}

export type OpenRouterChatRequest = {
  model: string
  maxTokens: number
  temperature: number
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  system?: string
}

export type OpenRouterTextResult = {
  text: string
  model: string
  tokenUsage: number
}

export type OpenRouterUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type SseResponse = {
  status(code: number): SseResponse
  setHeader(name: string, value: string): void
  flushHeaders?: () => void
  write(chunk: string): void
  end(): void
}

export type StudentInsightRow = {
  id: string
  tenantId: string
  studentId: string
  type: string
  content: string
  confidence: string | null
  generatedAt: Date
  createdAt: Date
  updatedAt: Date
}
