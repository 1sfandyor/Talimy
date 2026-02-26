import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import OpenAI from "openai"
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"

import type {
  OpenRouterChatRequest,
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
  private clientCache = new Map<string, OpenAI>()

  async chat(input: OpenRouterChatRequest): Promise<OpenRouterTextResult> {
    try {
      const client = this.getClient()
      const messages = this.toOpenRouterMessages(input)
      const completion = await client.chat.completions.create({
        model: input.model || this.defaultModel,
        messages,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
      })

      return {
        text: this.extractCompletionText(completion),
        model: String(completion.model ?? input.model ?? this.defaultModel),
        tokenUsage: this.toTokenUsage(completion.usage as OpenRouterUsage | undefined),
      }
    } catch (error) {
      throw new ServiceUnavailableException(
        this.toSdkErrorMessage("OpenRouter request failed", error)
      )
    }
  }

  async stream(
    input: OpenRouterChatRequest,
    response: SseResponse
  ): Promise<OpenRouterTextResult | null> {
    let fullText = ""
    let finalModel = input.model || this.defaultModel
    let finalUsage = 0

    try {
      const client = this.getClient()
      const messages = this.toOpenRouterMessages(input)
      const stream = await client.chat.completions.create({
        model: input.model || this.defaultModel,
        messages,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        stream: true,
        stream_options: { include_usage: true },
      })

      for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
        const delta = chunk.choices?.[0]?.delta?.content
        const deltaText = this.contentToText(delta)
        if (deltaText) {
          fullText += deltaText
          response.write(`data: ${JSON.stringify({ type: "chunk", text: deltaText })}\n\n`)
        }

        if (chunk.model) {
          finalModel = String(chunk.model)
        }
        if (chunk.usage) {
          finalUsage = this.toTokenUsage(chunk.usage as OpenRouterUsage)
        }

        if (chunk.choices?.[0]?.finish_reason) {
          response.write('data: {"type":"done"}\n\n')
        }
      }
    } catch (error) {
      throw new ServiceUnavailableException(
        this.toSdkErrorMessage("OpenRouter stream request failed", error)
      )
    }

    if (!fullText.trim()) {
      this.logger.warn("OpenRouter stream completed without text chunks")
      return null
    }

    return { text: fullText, model: finalModel, tokenUsage: finalUsage }
  }

  private requireApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) {
      throw new ServiceUnavailableException("OPENROUTER_API_KEY is not configured")
    }
    return key
  }

  private getClient(): OpenAI {
    const apiKey = this.requireApiKey()
    const cacheKey = `${this.baseUrl}|${apiKey}|${this.appReferer}|${this.appTitle}`
    const existing = this.clientCache.get(cacheKey)
    if (existing) return existing

    const client = new OpenAI({
      apiKey,
      baseURL: this.baseUrl.replace(/\/+$/, ""),
      defaultHeaders: {
        "HTTP-Referer": this.appReferer,
        "X-Title": this.appTitle,
      },
    })
    this.clientCache.set(cacheKey, client)
    return client
  }

  private toOpenRouterMessages(input: OpenRouterChatRequest): ChatCompletionMessageParam[] {
    const systemMessages = input.messages
      .filter((msg) => msg.role === "system")
      .map((msg) => msg.content.trim())
      .filter(Boolean)
    const system = [input.system, ...systemMessages].filter(Boolean).join("\n\n") || undefined

    const messages: ChatCompletionMessageParam[] = input.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }))

    if (system) {
      messages.unshift({ role: "system", content: system })
    }
    return messages.length > 0 ? messages : [{ role: "user", content: "Hello" }]
  }

  private extractCompletionText(completion: ChatCompletion): string {
    const content = completion.choices?.[0]?.message?.content
    const text = this.contentToText(content)?.trim()
    if (text) return text
    throw new ServiceUnavailableException("OpenRouter response did not include text content")
  }

  private contentToText(content: unknown): string {
    if (typeof content === "string") return content
    if (!Array.isArray(content)) return ""
    return content
      .map((item) => {
        if (!item || typeof item !== "object") return ""
        const typed = item as { type?: unknown; text?: unknown }
        return typed.type === "text" && typeof typed.text === "string" ? typed.text : ""
      })
      .join("")
  }

  private toTokenUsage(usage?: OpenRouterUsage): number {
    if (!usage) return 0
    const total = Number(usage.total_tokens ?? 0)
    if (total > 0) return total
    return Math.max(0, Number(usage.prompt_tokens ?? 0) + Number(usage.completion_tokens ?? 0))
  }

  private toSdkErrorMessage(prefix: string, error: unknown): string {
    const typed = error as {
      status?: number
      message?: string
      error?: { message?: string }
    }
    const statusPart = typeof typed?.status === "number" ? ` (${typed.status})` : ""
    const message =
      (typeof typed?.error?.message === "string" && typed.error.message) ||
      (typeof typed?.message === "string" && typed.message) ||
      "unknown error"
    return `${prefix}${statusPart}: ${message}`
  }
}
