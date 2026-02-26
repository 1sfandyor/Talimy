import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const userRouter = router({
  list: authedProxyQuery("user", "list", listUsersQuerySchema),
  getById: authedProxyQuery(
    "user",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("user", "create", createUserSchema),
  update: authedProxyProcedure(
    "user",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateUserSchema })
  ),
  delete: authedProxyProcedure(
    "user",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
})
