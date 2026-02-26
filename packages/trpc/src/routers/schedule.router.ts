import {
  createScheduleSchema,
  scheduleQuerySchema,
  updateScheduleSchema,
  userTenantQuerySchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const scheduleRouter = router({
  list: authedProxyQuery("schedule", "list", scheduleQuerySchema),
  getById: authedProxyQuery(
    "schedule",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("schedule", "create", createScheduleSchema),
  update: authedProxyProcedure(
    "schedule",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateScheduleSchema })
  ),
  delete: authedProxyProcedure(
    "schedule",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  byClass: authedProxyQuery(
    "schedule",
    "byClass",
    z
      .object({ tenantId: z.string().uuid(), classId: z.string().uuid() })
      .merge(userTenantQuerySchema.partial())
  ),
  byTeacher: authedProxyQuery(
    "schedule",
    "byTeacher",
    z
      .object({ tenantId: z.string().uuid(), teacherId: z.string().uuid() })
      .merge(userTenantQuerySchema.partial())
  ),
})
