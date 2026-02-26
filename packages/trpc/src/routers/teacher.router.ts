import { createTeacherSchema, listTeachersQuerySchema, updateTeacherSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const teacherRouter = router({
  list: authedProxyQuery("teacher", "list", listTeachersQuerySchema),
  getById: authedProxyQuery(
    "teacher",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("teacher", "create", createTeacherSchema),
  update: authedProxyProcedure(
    "teacher",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateTeacherSchema })
  ),
  delete: authedProxyProcedure(
    "teacher",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  schedule: authedProxyQuery(
    "teacher",
    "schedule",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  classes: authedProxyQuery(
    "teacher",
    "classes",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
})
