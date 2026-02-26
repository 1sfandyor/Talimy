import { TRPCError, initTRPC } from "@trpc/server"
import superjson from "superjson"

import type { TrpcContext } from "./context"

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson })

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const router = t.router
export const publicProcedure = t.procedure
export const authedProcedure = t.procedure.use(requireAuth)

export function getHandler(
  ctx: TrpcContext,
  namespace: keyof TrpcContext["handlers"],
  method: string
) {
  const handler = ctx.handlers[namespace]?.[method]
  if (!handler) {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: `tRPC handler not implemented: ${String(namespace)}.${method}`,
    })
  }
  return handler
}
