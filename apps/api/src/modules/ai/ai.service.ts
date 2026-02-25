import { Readable } from "node:stream"

import {
  aiConversations,
  aiInsights,
  aiReports,
  attendance,
  db,
  grades,
  students,
  users,
} from "@talimy/database"
import { and, avg, count, desc, eq, isNull, sql } from "drizzle-orm"
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"

import type { CurrentUser as CurrentUserPayload } from "@/common/decorators/current-user.decorator"

import type { AiChatDto } from "./dto/chat.dto"
import type { AiInsightsQueryDto, AiReportGenerateDto } from "./dto/report.dto"

type Actor = CurrentUserPayload

type AnthropicMessage = {
  role: "user" | "assistant"
  content: string
}

type AnthropicTextResult = {
  text: string
  model: string
  tokenUsage: number
}

type AnthropicUsage = {
  input_tokens?: number
  output_tokens?: number
}

type StudentInsightRow = {
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

type SseResponse = {
  status(code: number): SseResponse
  setHeader(name: string, value: string): void
  flushHeaders?: () => void
  write(chunk: string): void
  end(): void
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly anthropicVersion = process.env.ANTHROPIC_API_VERSION?.trim() || "2023-06-01"
  private readonly anthropicModel =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"
  private readonly anthropicBaseUrl =
    process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com"

  async chat(actor: Actor, payload: AiChatDto) {
    this.assertTenantScope(actor, payload.tenantId)
    const result = await this.generateChatCompletion(payload)

    const [conversation] = await db
      .insert(aiConversations)
      .values({
        tenantId: payload.tenantId,
        userId: actor.id,
        messages: payload.messages,
        model: result.model,
        tokenUsage: result.tokenUsage,
      })
      .returning({
        id: aiConversations.id,
        createdAt: aiConversations.createdAt,
      })

    return {
      id: conversation?.id ?? null,
      tenantId: payload.tenantId,
      userId: actor.id,
      response: result.text,
      model: result.model,
      tokenUsage: result.tokenUsage,
      createdAt: conversation?.createdAt?.toISOString() ?? new Date().toISOString(),
    }
  }

  async streamChat(actor: Actor, payload: AiChatDto, response: unknown): Promise<void> {
    this.assertTenantScope(actor, payload.tenantId)
    const apiKey = this.requireAnthropicKey()
    const sse = response as SseResponse

    sse.status(200)
    sse.setHeader("Content-Type", "text/event-stream")
    sse.setHeader("Cache-Control", "no-cache, no-transform")
    sse.setHeader("Connection", "keep-alive")
    sse.flushHeaders?.()

    const { system, messages } = this.toAnthropicMessages(payload)
    let fullText = ""
    let finalUsage = 0
    let finalModel = payload.model ?? this.anthropicModel

    try {
      const res = await fetch(`${this.anthropicBaseUrl.replace(/\/+$/, "")}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": this.anthropicVersion,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: payload.model ?? this.anthropicModel,
          max_tokens: payload.maxTokens ?? 512,
          temperature: payload.temperature ?? 0.2,
          stream: true,
          system,
          messages,
        }),
      })

      if (!res.ok || !res.body) {
        const body = await res.text()
        throw new ServiceUnavailableException(
          `Anthropic stream request failed (${res.status}): ${body.slice(0, 300)}`
        )
      }

      const reader = Readable.fromWeb(res.body as never)
      let buffer = ""
      for await (const chunk of reader) {
        buffer += chunk.toString("utf8")
        while (buffer.includes("\n\n")) {
          const idx = buffer.indexOf("\n\n")
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const parsed = this.parseAnthropicSseEvent(rawEvent)
          if (!parsed) continue

          if (parsed.type === "content_block_delta" && typeof parsed.delta?.text === "string") {
            fullText += parsed.delta.text
            sse.write(`data: ${JSON.stringify({ type: "chunk", text: parsed.delta.text })}\n\n`)
          } else if (parsed.type === "message_delta") {
            finalModel = parsed.model ?? finalModel
            finalUsage = this.toTokenUsage(parsed.usage)
          } else if (parsed.type === "message_stop") {
            sse.write('data: {"type":"done"}\n\n')
          }
        }
      }

      await db.insert(aiConversations).values({
        tenantId: payload.tenantId,
        userId: actor.id,
        messages: payload.messages,
        model: finalModel,
        tokenUsage: finalUsage,
      })
    } catch (error) {
      this.logger.error(
        `AI stream failed for tenant=${payload.tenantId} user=${actor.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
      sse.write(
        `data: ${JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "AI stream failed",
        })}\n\n`
      )
    } finally {
      sse.end()
    }
  }

  async getStudentInsights(actor: Actor, studentId: string, query: AiInsightsQueryDto) {
    this.assertTenantScope(actor, query.tenantId)

    const [student] = await db
      .select({
        id: students.id,
        tenantId: students.tenantId,
        studentCode: students.studentId,
        status: students.status,
        gender: students.gender,
        classId: students.classId,
        enrollmentDate: students.enrollmentDate,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(
        and(
          eq(students.id, studentId),
          eq(students.tenantId, query.tenantId),
          isNull(students.deletedAt),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    if (!student) {
      throw new NotFoundException("Student not found")
    }

    if (!query.regenerate) {
      const existingFilters = [
        eq(aiInsights.tenantId, query.tenantId),
        eq(aiInsights.studentId, studentId),
        isNull(aiInsights.deletedAt),
        query.type ? eq(aiInsights.type, query.type) : undefined,
      ].filter((value): value is NonNullable<typeof value> => Boolean(value))

      const existingRows = await db
        .select({
          id: aiInsights.id,
          tenantId: aiInsights.tenantId,
          studentId: aiInsights.studentId,
          type: aiInsights.type,
          content: aiInsights.content,
          confidence: aiInsights.confidence,
          generatedAt: aiInsights.generatedAt,
          createdAt: aiInsights.createdAt,
          updatedAt: aiInsights.updatedAt,
        })
        .from(aiInsights)
        .where(and(...existingFilters))
        .orderBy(desc(aiInsights.generatedAt))
        .limit(5)

      if (existingRows.length > 0) {
        return {
          studentId,
          tenantId: query.tenantId,
          regenerated: false,
          items: existingRows.map((row) => this.mapInsightRow(row)),
        }
      }
    }

    const [gradeAgg] = await db
      .select({
        count: count(grades.id),
        averageScore: avg(grades.score),
      })
      .from(grades)
      .where(
        and(
          eq(grades.tenantId, query.tenantId),
          eq(grades.studentId, studentId),
          isNull(grades.deletedAt)
        )
      )

    const [attendanceAgg] = await db
      .select({
        total: count(attendance.id),
        absentCount: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'absent')::int`.as(
          "absent_count"
        ),
        lateCount: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'late')::int`.as(
          "late_count"
        ),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, query.tenantId),
          eq(attendance.studentId, studentId),
          isNull(attendance.deletedAt)
        )
      )

    const insightType = query.type ?? "progress_summary"
    const prompt = [
      "You are an educational assistant for a school management system.",
      "Generate concise, practical student insight in Uzbek Latin script.",
      `Insight type: ${insightType}`,
      `Student: ${student.firstName} ${student.lastName}`,
      `Student code: ${student.studentCode}`,
      `Status: ${student.status}`,
      `Gender: ${student.gender}`,
      `Enrollment date: ${student.enrollmentDate ?? "n/a"}`,
      `Grade count: ${gradeAgg?.count ?? 0}`,
      `Average score: ${gradeAgg?.averageScore ?? "n/a"}`,
      `Attendance total: ${attendanceAgg?.total ?? 0}`,
      `Attendance absences: ${attendanceAgg?.absentCount ?? 0}`,
      `Attendance late: ${attendanceAgg?.lateCount ?? 0}`,
      "Return 3-6 short bullet-like recommendations as plain text.",
    ].join("\n")

    const ai = await this.callAnthropicText({
      system:
        "You produce safe, supportive educational recommendations. Do not invent sensitive facts.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 350,
      temperature: 0.2,
      model: this.anthropicModel,
    })

    const confidence = this.estimateConfidence(gradeAgg?.count ?? 0, attendanceAgg?.total ?? 0)
    const [created] = await db
      .insert(aiInsights)
      .values({
        tenantId: query.tenantId,
        studentId,
        type: insightType,
        content: ai.text.slice(0, 5000),
        confidence,
        generatedAt: new Date(),
      })
      .returning({
        id: aiInsights.id,
        tenantId: aiInsights.tenantId,
        studentId: aiInsights.studentId,
        type: aiInsights.type,
        content: aiInsights.content,
        confidence: aiInsights.confidence,
        generatedAt: aiInsights.generatedAt,
        createdAt: aiInsights.createdAt,
        updatedAt: aiInsights.updatedAt,
      })

    return {
      studentId,
      tenantId: query.tenantId,
      regenerated: true,
      tokenUsage: ai.tokenUsage,
      model: ai.model,
      items: created ? [this.mapInsightRow(created)] : [],
    }
  }

  async generateReport(actor: Actor, payload: AiReportGenerateDto) {
    this.assertTenantScope(actor, payload.tenantId)

    const [studentCountRow] = await db
      .select({ total: count(students.id) })
      .from(students)
      .where(and(eq(students.tenantId, payload.tenantId), isNull(students.deletedAt)))

    const [gradeCountRow] = await db
      .select({ total: count(grades.id), averageScore: avg(grades.score) })
      .from(grades)
      .where(and(eq(grades.tenantId, payload.tenantId), isNull(grades.deletedAt)))

    const [attendanceCountRow] = await db
      .select({ total: count(attendance.id) })
      .from(attendance)
      .where(and(eq(attendance.tenantId, payload.tenantId), isNull(attendance.deletedAt)))

    const context = {
      tenantId: payload.tenantId,
      type: payload.type,
      parameters: payload.parameters ?? {},
      stats: {
        students: studentCountRow?.total ?? 0,
        grades: gradeCountRow?.total ?? 0,
        averageScore: gradeCountRow?.averageScore ?? null,
        attendanceRecords: attendanceCountRow?.total ?? 0,
      },
      generatedBy: actor.id,
    }

    const ai = await this.callAnthropicText({
      system:
        "You generate concise school management summaries in Uzbek Latin. Focus on actionable insights.",
      messages: [
        {
          role: "user",
          content: `Generate report for ${payload.type}.\nData:\n${JSON.stringify(context)}`,
        },
      ],
      maxTokens: 700,
      temperature: 0.2,
      model: this.anthropicModel,
    })

    const result = {
      summary: ai.text,
      tokenUsage: ai.tokenUsage,
      model: ai.model,
      generatedAt: new Date().toISOString(),
      context,
    }

    const [created] = await db
      .insert(aiReports)
      .values({
        tenantId: payload.tenantId,
        type: payload.type,
        parameters: payload.parameters ?? null,
        result,
        generatedBy: actor.id,
      })
      .returning({
        id: aiReports.id,
        tenantId: aiReports.tenantId,
        type: aiReports.type,
        parameters: aiReports.parameters,
        result: aiReports.result,
        generatedBy: aiReports.generatedBy,
        createdAt: aiReports.createdAt,
        updatedAt: aiReports.updatedAt,
      })

    return created
      ? {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        }
      : null
  }

  private assertTenantScope(actor: Actor, tenantId: string): void {
    const isPlatformAdmin = actor.roles?.includes("platform_admin") ?? false
    if (!isPlatformAdmin && actor.tenantId && actor.tenantId !== tenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }
  }

  private requireAnthropicKey(): string {
    const key = process.env.ANTHROPIC_API_KEY?.trim()
    if (!key) {
      throw new ServiceUnavailableException("ANTHROPIC_API_KEY is not configured")
    }
    return key
  }

  private async generateChatCompletion(payload: AiChatDto): Promise<AnthropicTextResult> {
    return this.callAnthropicText({
      model: payload.model ?? this.anthropicModel,
      maxTokens: payload.maxTokens ?? 512,
      temperature: payload.temperature ?? 0.2,
      messages: payload.messages,
    })
  }

  private async callAnthropicText(input: {
    model: string
    maxTokens: number
    temperature: number
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
    system?: string
  }): Promise<AnthropicTextResult> {
    const apiKey = this.requireAnthropicKey()
    const { system, messages } = this.toAnthropicMessages(input)

    const res = await fetch(`${this.anthropicBaseUrl.replace(/\/+$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": this.anthropicVersion,
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        system,
        messages,
      }),
    })

    const text = await res.text()
    let json: Record<string, unknown> | null = null
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      json = null
    }

    if (!res.ok || !json) {
      throw new ServiceUnavailableException(
        `Anthropic request failed (${res.status}): ${(json?.error as { message?: string } | undefined)?.message ?? text.slice(0, 300)}`
      )
    }

    const contentText = this.extractAnthropicText(json)
    return {
      text: contentText,
      model: String(json.model ?? input.model),
      tokenUsage: this.toTokenUsage(json.usage as AnthropicUsage | undefined),
    }
  }

  private toAnthropicMessages(input: {
    system?: string
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  }): { system?: string; messages: AnthropicMessage[] } {
    const systemMessages = input.messages
      .filter((msg) => msg.role === "system")
      .map((msg) => msg.content.trim())
      .filter(Boolean)
    const system = [input.system, ...systemMessages].filter(Boolean).join("\n\n") || undefined

    const messages = input.messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }))

    if (messages.length === 0) {
      messages.push({ role: "user", content: "Hello" })
    }

    return { system, messages }
  }

  private extractAnthropicText(json: Record<string, unknown>): string {
    const blocks = Array.isArray(json.content) ? json.content : []
    const text = blocks
      .map((block) => {
        if (!block || typeof block !== "object") return ""
        const typed = block as { type?: unknown; text?: unknown }
        return typed.type === "text" && typeof typed.text === "string" ? typed.text : ""
      })
      .join("")
      .trim()

    if (!text) {
      throw new ServiceUnavailableException("Anthropic response did not include text content")
    }
    return text
  }

  private toTokenUsage(usage?: AnthropicUsage): number {
    const inputTokens = Number(usage?.input_tokens ?? 0)
    const outputTokens = Number(usage?.output_tokens ?? 0)
    return Math.max(0, inputTokens + outputTokens)
  }

  private estimateConfidence(gradeCount: number, attendanceCount: number): string {
    const score = Math.min(
      0.99,
      0.4 + Math.min(gradeCount, 20) * 0.02 + Math.min(attendanceCount, 60) * 0.005
    )
    return score.toFixed(2)
  }

  private mapInsightRow(row: StudentInsightRow) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      studentId: row.studentId,
      type: row.type,
      content: row.content,
      confidence: row.confidence ? Number(row.confidence) : null,
      generatedAt: row.generatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private parseAnthropicSseEvent(rawEvent: string): {
    type?: string
    delta?: { text?: string }
    usage?: AnthropicUsage
    model?: string
  } | null {
    const lines = rawEvent.split(/\r?\n/).filter(Boolean)
    const dataLine = lines.find((line) => line.startsWith("data:"))
    if (!dataLine) return null
    const payload = dataLine.slice(5).trim()
    if (!payload || payload === "[DONE]") return null
    try {
      return JSON.parse(payload) as {
        type?: string
        delta?: { text?: string }
        usage?: AnthropicUsage
        model?: string
      }
    } catch {
      return null
    }
  }
}
