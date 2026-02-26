import { Logger, type INestApplication } from "@nestjs/common"
import { listTenantsQuerySchema } from "@talimy/shared"
import { TRPCError, initTRPC } from "@trpc/server"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import superjson from "superjson"

import { AuthService } from "@/modules/auth/auth.service"
import type { AuthIdentity } from "@/modules/auth/auth.types"

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

const apiTrpcRouter = t.router({
  tenant: t.router({
    list: authedProcedure.input(listTenantsQuerySchema).query(() => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "tRPC tenant.list backend handler is not wired yet",
      })
    }),
  }),
})

const logger = new Logger("TrpcHttpAdapter")

export function mountTrpcHttpAdapter(app: INestApplication): void {
  const authService = app.get(AuthService, { strict: false })
  const expressApp = app.getHttpAdapter().getInstance()

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

