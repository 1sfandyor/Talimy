import { Logger, type INestApplication } from "@nestjs/common"
import {
  createTenantSchema,
  listTenantsQuerySchema,
  updateTenantBillingSchema,
  updateTenantSchema,
} from "@talimy/shared"
import { TRPCError, initTRPC } from "@trpc/server"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import superjson from "superjson"
import { z } from "zod"

import { AuthService } from "@/modules/auth/auth.service"
import type { AuthIdentity } from "@/modules/auth/auth.types"
import { TenantsService } from "@/modules/tenants/tenants.service"
import type { CreateTenantDto } from "@/modules/tenants/dto/create-tenant.dto"
import type { ListTenantsQueryDto } from "@/modules/tenants/dto/list-tenants-query.dto"
import type { UpdateTenantBillingDto } from "@/modules/tenants/dto/update-tenant-billing.dto"
import type { UpdateTenantDto } from "@/modules/tenants/dto/update-tenant.dto"

type ApiTrpcContext = {
  user: AuthIdentity | null
}

const t = initTRPC.context<ApiTrpcContext>().create({ transformer: superjson })

const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
  }
  return next({ ctx })
})

const platformAdminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!ctx.user?.roles.includes("platform_admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform admin role is required" })
  }
  return next({ ctx })
})

function createApiTrpcRouter(tenantsService: TenantsService) {
  return t.router({
    tenant: t.router({
      list: platformAdminProcedure.input(listTenantsQuerySchema).query(({ input }) => {
        return tenantsService.list(input as ListTenantsQueryDto)
      }),
      getById: platformAdminProcedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => {
        return tenantsService.getById(input.id)
      }),
      create: platformAdminProcedure.input(createTenantSchema).mutation(({ input }) => {
        return tenantsService.create(input as CreateTenantDto)
      }),
      update: platformAdminProcedure
        .input(z.object({ id: z.string().uuid(), payload: updateTenantSchema }))
        .mutation(({ input }) => {
          return tenantsService.update(input.id, input.payload as UpdateTenantDto)
        }),
      delete: platformAdminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ input }) => {
          return tenantsService.delete(input.id)
        }),
      stats: platformAdminProcedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => {
        return tenantsService.getStats(input.id)
      }),
      billing: platformAdminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ input }) => {
          return tenantsService.getBilling(input.id)
        }),
      updateBilling: platformAdminProcedure
        .input(z.object({ id: z.string().uuid(), payload: updateTenantBillingSchema }))
        .mutation(({ input }) => {
          return tenantsService.updateBilling(input.id, input.payload as UpdateTenantBillingDto)
        }),
    }),
  })
}

const logger = new Logger("TrpcHttpAdapter")

export function mountTrpcHttpAdapter(app: INestApplication): void {
  const authService = app.get(AuthService, { strict: false })
  const tenantsService = app.get(TenantsService, { strict: false })
  const expressApp = app.getHttpAdapter().getInstance()
  const apiTrpcRouter = createApiTrpcRouter(tenantsService)

  expressApp.use(
    "/api/trpc",
    createExpressMiddleware({
      router: apiTrpcRouter,
      createContext: ({ req }) => ({
        user: resolveRequestUser(req.headers?.authorization, authService),
      }),
      onError({ path, error }) {
        logger.warn(`tRPC error on ${path ?? "(unknown)"}: ${error.message}`)
      },
    })
  )
}

function resolveRequestUser(
  authorizationHeader: string | string[] | undefined,
  authService: AuthService
): AuthIdentity | null {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader
  if (!raw) {
    return null
  }

  const [scheme, token] = raw.split(" ", 2)
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null
  }

  try {
    return authService.verifyAccessToken(token)
  } catch {
    return null
  }
}
