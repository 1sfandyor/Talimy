import { TRPCError, initTRPC } from "@trpc/server"
import superjson from "superjson"

import type { TrpcContext } from "./context"

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson })
export const trpcTransformer = superjson

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

const requireTenantScope = t.middleware(({ ctx, input, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
  }

  const isPlatformAdmin = ctx.user.roles?.includes("platform_admin") ?? false
  if (isPlatformAdmin) {
    return next({ ctx: { ...ctx, user: ctx.user } })
  }

  const userTenantId = ctx.user.tenantId
  if (!userTenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authenticated tenant is required" })
  }

  const tenantIds = collectTenantIds(input)
  if (tenantIds.some((tenantId) => tenantId !== userTenantId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tenant mismatch" })
  }

  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const router = t.router
export const publicProcedure = t.procedure
export const authedProcedure = t.procedure.use(requireAuth)
export const tenantAuthedProcedure = t.procedure.use(requireAuth).use(requireTenantScope)

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

function collectTenantIds(input: unknown): string[] {
  const found = new Set<string>()
  const seen = new WeakSet<object>()

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") {
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item)
      }
      return
    }

    if (seen.has(value)) {
      return
    }
    seen.add(value)

    const record = value as Record<string, unknown>
    const tenantId = record.tenantId
    if (typeof tenantId === "string" && tenantId.length > 0) {
      found.add(tenantId)
    }

    for (const nested of Object.values(record)) {
      visit(nested)
    }
  }

  visit(input)
  return Array.from(found)
}
