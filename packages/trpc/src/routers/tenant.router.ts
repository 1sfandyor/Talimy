import {
  createTenantSchema,
  listTenantsQuerySchema,
  updateTenantBillingSchema,
  updateTenantSchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const tenantRouter = router({
  list: authedProxyQuery("tenant", "list", listTenantsQuerySchema),
  getById: authedProxyQuery("tenant", "getById", z.object({ id: z.string().uuid() })),
  create: authedProxyProcedure("tenant", "create", createTenantSchema),
  update: authedProxyProcedure(
    "tenant",
    "update",
    z.object({ id: z.string().uuid(), payload: updateTenantSchema })
  ),
  delete: authedProxyProcedure("tenant", "delete", z.object({ id: z.string().uuid() })),
  stats: authedProxyQuery("tenant", "stats", z.object({ id: z.string().uuid() })),
  billing: authedProxyQuery("tenant", "billing", z.object({ id: z.string().uuid() })),
  updateBilling: authedProxyProcedure(
    "tenant",
    "updateBilling",
    z.object({ id: z.string().uuid(), payload: updateTenantBillingSchema })
  ),
})
