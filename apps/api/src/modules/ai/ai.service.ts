import { aiConversations, aiInsights, aiReports, db } from "@talimy/database"
import { ForbiddenException, Injectable } from "@nestjs/common"

import type { CurrentUser as CurrentUserPayload } from "@/common/decorators/current-user.decorator"

import { AiOpenRouterClient } from "./ai.openrouter.client"
import { buildStudentInsightPrompt, estimateInsightConfidence, mapInsightRow } from "./ai.helpers"
import { AiRepository } from "./ai.repository"
import type { AiActor, SseResponse, StudentInsightRow } from "./ai.types"
import type { AiChatDto } from "./dto/chat.dto"
import type { AiInsightsQueryDto, AiReportGenerateDto } from "./dto/report.dto"

@Injectable()
export class AiService {
  constructor(
    private readonly openRouterClient: AiOpenRouterClient,
    private readonly repository: AiRepository
  ) {}

  async chat(actor: CurrentUserPayload, payload: AiChatDto) {
    this.assertTenantScope(actor, payload.tenantId)
    const result = await this.openRouterClient.chat({
      model: payload.model ?? "",
      maxTokens: payload.maxTokens ?? 512,
      temperature: payload.temperature ?? 0.2,
      messages: payload.messages,
    })

    const [conversation] = await db
      .insert(aiConversations)
      .values({
        tenantId: payload.tenantId,
        userId: actor.id,
        messages: payload.messages,
        model: result.model,
        tokenUsage: result.tokenUsage,
      })
      .returning({ id: aiConversations.id, createdAt: aiConversations.createdAt })

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

  async streamChat(
    actor: CurrentUserPayload,
    payload: AiChatDto,
    response: unknown
  ): Promise<void> {
    this.assertTenantScope(actor, payload.tenantId)
    const sse = response as SseResponse

    sse.status(200)
    sse.setHeader("Content-Type", "text/event-stream")
    sse.setHeader("Cache-Control", "no-cache, no-transform")
    sse.setHeader("Connection", "keep-alive")
    sse.flushHeaders?.()

    try {
      const result = await this.openRouterClient.stream(
        {
          model: payload.model ?? "",
          maxTokens: payload.maxTokens ?? 512,
          temperature: payload.temperature ?? 0.2,
          messages: payload.messages,
        },
        sse
      )

      if (result) {
        await db.insert(aiConversations).values({
          tenantId: payload.tenantId,
          userId: actor.id,
          messages: payload.messages,
          model: result.model,
          tokenUsage: result.tokenUsage,
        })
      }
    } catch (error) {
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

  async getStudentInsights(
    actor: CurrentUserPayload,
    studentId: string,
    query: AiInsightsQueryDto
  ) {
    this.assertTenantScope(actor, query.tenantId)
    const student = await this.repository.getStudentForInsights(query.tenantId, studentId)

    if (!query.regenerate) {
      const existing = await this.repository.listExistingInsights(
        query.tenantId,
        studentId,
        query.type
      )
      if (existing.length > 0) {
        return {
          tenantId: query.tenantId,
          studentId,
          regenerated: false,
          items: existing.map(mapInsightRow),
        }
      }
    }

    const aggregates = await this.repository.getStudentAggregates(query.tenantId, studentId)
    const insightType = query.type ?? "progress_summary"
    const ai = await this.openRouterClient.chat({
      model: process.env.OPENROUTER_MODEL?.trim() || "",
      maxTokens: 350,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: buildStudentInsightPrompt({
            insightType,
            student,
            gradeCount: aggregates.gradeCount,
            averageScore: aggregates.averageScore,
            attendanceTotal: aggregates.attendanceTotal,
            absentCount: aggregates.absentCount,
            lateCount: aggregates.lateCount,
          }),
        },
      ],
      system:
        "You produce safe, supportive educational recommendations. Do not invent sensitive facts.",
    })

    const [created] = await db
      .insert(aiInsights)
      .values({
        tenantId: query.tenantId,
        studentId,
        type: insightType,
        content: ai.text.slice(0, 5000),
        confidence: estimateInsightConfidence(aggregates.gradeCount, aggregates.attendanceTotal),
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
      tenantId: query.tenantId,
      studentId,
      regenerated: true,
      tokenUsage: ai.tokenUsage,
      model: ai.model,
      items: created ? [mapInsightRow(created as StudentInsightRow)] : [],
    }
  }

  async generateReport(actor: CurrentUserPayload, payload: AiReportGenerateDto) {
    this.assertTenantScope(actor, payload.tenantId)
    const stats = await this.repository.getTenantReportStats(payload.tenantId)
    const context = {
      tenantId: payload.tenantId,
      type: payload.type,
      parameters: payload.parameters ?? {},
      stats,
      generatedBy: actor.id,
    }

    const ai = await this.openRouterClient.chat({
      model: process.env.OPENROUTER_MODEL?.trim() || "",
      maxTokens: 700,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `Generate report for ${payload.type}.\nData:\n${JSON.stringify(context)}`,
        },
      ],
      system:
        "You generate concise school management summaries in Uzbek Latin. Focus on actionable insights.",
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

  private assertTenantScope(actor: AiActor, tenantId: string) {
    const isPlatformAdmin = actor.roles?.includes("platform_admin") ?? false
    if (!isPlatformAdmin && actor.tenantId && actor.tenantId !== tenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }
  }
}
