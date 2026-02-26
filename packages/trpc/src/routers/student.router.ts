import { createStudentSchema, listStudentsQuerySchema, updateStudentSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const studentRouter = router({
  list: authedProxyQuery("student", "list", listStudentsQuerySchema),
  getById: authedProxyQuery(
    "student",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("student", "create", createStudentSchema),
  update: authedProxyProcedure(
    "student",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateStudentSchema })
  ),
  delete: authedProxyProcedure(
    "student",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  grades: authedProxyQuery(
    "student",
    "grades",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  attendance: authedProxyQuery(
    "student",
    "attendance",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
})
