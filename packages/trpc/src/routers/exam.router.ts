import {
  createExamSchema,
  enterExamResultsSchema,
  examQuerySchema,
  updateExamSchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const examRouter = router({
  list: authedProxyQuery("exam", "list", examQuerySchema),
  getById: authedProxyQuery(
    "exam",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("exam", "create", createExamSchema),
  update: authedProxyProcedure(
    "exam",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateExamSchema })
  ),
  delete: authedProxyProcedure(
    "exam",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  results: authedProxyQuery(
    "exam",
    "results",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  stats: authedProxyQuery(
    "exam",
    "stats",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  enterResults: authedProxyProcedure(
    "exam",
    "enterResults",
    z.object({
      examId: z.string().uuid(),
      payload: enterExamResultsSchema,
      tenantId: z.string().uuid().optional(),
    })
  ),
})
