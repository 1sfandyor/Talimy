import { createParentSchema, listParentsQuerySchema, updateParentSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const parentRouter = router({
  list: authedProxyQuery("parent", "list", listParentsQuerySchema),
  getById: authedProxyQuery(
    "parent",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("parent", "create", createParentSchema),
  update: authedProxyProcedure(
    "parent",
    "update",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updateParentSchema })
  ),
  delete: authedProxyProcedure(
    "parent",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  children: authedProxyQuery(
    "parent",
    "children",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
})
