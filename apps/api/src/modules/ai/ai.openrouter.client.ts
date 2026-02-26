import { Readable } from "node:stream"

import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

import type {
  OpenRouterChatRequest,
  OpenRouterMessage,
  OpenRouterTextResult,
  OpenRouterUsage,
  SseResponse,
} from "./ai.types"

@Injectable()
export class AiOpenRouterClient {
  private readonly logger = new Logger(AiOpenRouterClient.name)
  private readonly baseUrl =
    process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1"
  private readonly defaultModel =
    process.env.OPENROUTER_MODEL?.trim() || "arcee-ai/trinity-large-preview:free"
  private readonly appReferer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://talimy.space"
  private readonly appTitle = process.env.OPENROUTER_X_TITLE?.trim() || "Talimy"

  async chat(input: OpenRouterChatRequest): Promise<OpenRouterTextResult> {
    const apiKey = this.requireApiKey()
    const { system, messages } = this.toOpenRouterMessages(input)

    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        messages: system ? [{ role: "system", content: system }, ...messages] : messages,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
      }),
    })

    const rawText = await res.text()
    const json = this.tryParseJson(rawText)

    if (!res.ok || !json) {
      throw new ServiceUnavailableException(
        `OpenRouter request failed (${res.status}): ${this.extractErrorMessage(json, rawText)}`
      )
    }

    return {
      text: this.extractChatText(json),
      model: String(json.model ?? input.model ?? this.defaultModel),
      tokenUsage: this.toTokenUsage(json.usage as OpenRouterUsage | undefined),
    }
  }

  async stream(
    input: OpenRouterChatRequest,
    response: SseResponse
  ): Promise<OpenRouterTextResult | null> {
    const apiKey = this.requireApiKey()
    const { system, messages } = this.toOpenRouterMessages(input)

    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify({
        model: input.model || this.defaultModel,
        messages: system ? [{ role: "system", content: system }, ...messages] : messages,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        stream: true,
        stream_options: { include_usage: true },
      }),
    })

    if (!res.ok || !res.body) {
      const body = await res.text()
      throw new ServiceUnavailableException(
        `OpenRouter stream request failed (${res.status}): ${body.slice(0, 300)}`
      )
    }

    let fullText = ""
    let finalModel = input.model || this.defaultModel
    let finalUsage = 0
    let buffer = ""
    const reader = Readable.fromWeb(res.body as never)

    for await (const chunk of reader) {
      buffer += chunk.toString("utf8")
      while (buffer.includes("\n\n")) {
        const idx = buffer.indexOf("\n\n")
        const rawEvent = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const parsed = this.parseSseEvent(rawEvent)
        if (!parsed) continue

        const deltaText = parsed.choices?.[0]?.delta?.content
        if (typeof deltaText === "string" && deltaText.length > 0) {
          fullText += deltaText
          response.write(`data: ${JSON.stringify({ type: "chunk", text: deltaText })}\n\n`)
        }

        if (parsed.model) {
          finalModel = String(parsed.model)
        }
        if (parsed.usage) {
          finalUsage = this.toTokenUsage(parsed.usage as OpenRouterUsage)
        }

        const finish = parsed.choices?.[0]?.finish_reason
        if (finish) {
          response.write('data: {"type":"done"}\n\n')
        }
      }
    }

    if (!fullText.trim()) {
      this.logger.warn("OpenRouter stream completed without text chunks")
      return null
    }

    return { text: fullText, model: finalModel, tokenUsage: finalUsage }
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.appReferer,
      "X-Title": this.appTitle,
    }
  }

  private requireApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) {
      throw new ServiceUnavailableException("OPENROUTER_API_KEY is not configured")
    }
    return key
  }

  private toOpenRouterMessages(input: OpenRouterChatRequest): {
    system?: string
    messages: OpenRouterMessage[]
  } {
    const systemMessages = input.messages
      .filter((msg) => msg.role === "system")
      .map((msg) => msg.content.trim())
      .filter(Boolean)
    const system = [input.system, ...systemMessages].filter(Boolean).join("\n\n") || undefined

    const messages = input.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }))

    return {
      system,
      messages: messages.length > 0 ? messages : [{ role: "user", content: "Hello" }],
    }
  }

  private extractChatText(json: Record<string, unknown>): string {
    const choices = Array.isArray(json.choices) ? json.choices : []
    const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message
    const content = message?.content

    if (typeof content === "string" && content.trim()) return content.trim()
    if (Array.isArray(content)) {
      const text = content
        .map((item) => {
          if (!item || typeof item !== "object") return ""
          const typed = item as { type?: unknown; text?: unknown }
          return typed.type === "text" && typeof typed.text === "string" ? typed.text : ""
        })
        .join("")
        .trim()
      if (text) return text
    }

    throw new ServiceUnavailableException("OpenRouter response did not include text content")
  }

  private toTokenUsage(usage?: OpenRouterUsage): number {
    if (!usage) return 0
    const total = Number(usage.total_tokens ?? 0)
    if (total > 0) return total
    return Math.max(0, Number(usage.prompt_tokens ?? 0) + Number(usage.completion_tokens ?? 0))
  }

  private parseSseEvent(rawEvent: string): Record<string, any> | null {
    const lines = rawEvent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.some((line) => line.startsWith(":"))) return null
    const dataLines = lines.filter((line) => line.startsWith("data:"))
    if (dataLines.length === 0) return null
    const payload = dataLines.map((line) => line.slice(5).trim()).join("\n")
    if (!payload || payload === "[DONE]") return null
    return this.tryParseJson(payload)
  }

  private tryParseJson(text: string): Record<string, unknown> | null {
    try {
      return text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  private extractErrorMessage(json: Record<string, unknown> | null, rawText: string): string {
    const err = json?.error as { message?: unknown } | undefined
    if (err && typeof err.message === "string") return err.message
    return rawText.slice(0, 300)
  }
}
