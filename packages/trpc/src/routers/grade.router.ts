import {
  createGradeScaleSchema,
  createGradeSchema,
  gradeQuerySchema,
  updateGradeScaleSchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const gradeRouter = router({
  enter: authedProxyProcedure("grade", "enter", createGradeSchema),
  list: authedProxyQuery("grade", "list", gradeQuerySchema),
  report: authedProxyQuery("grade", "report", z.object({ tenantId: z.string().uuid() })),
  scales: authedProxyQuery("grade", "scales", z.object({ tenantId: z.string().uuid() })),
  createScale: authedProxyProcedure("grade", "createScale", createGradeScaleSchema),
  updateScale: authedProxyProcedure(
    "grade",
    "updateScale",
    z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      payload: updateGradeScaleSchema,
    })
  ),
  deleteScale: authedProxyProcedure(
    "grade",
    "deleteScale",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
})
