import { aiChatSchema, aiInsightsQuerySchema, aiReportGenerateSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const aiRouter = router({
  chat: authedProxyProcedure("ai", "chat", aiChatSchema),
  insights: authedProxyQuery(
    "ai",
    "insights",
    z.object({ studentId: z.string().uuid(), query: aiInsightsQuerySchema })
  ),
  generateReport: authedProxyProcedure("ai", "generateReport", aiReportGenerateSchema),
})
