import type { ZodTypeAny } from "zod"

import { authedProcedure, publicProcedure, getHandler } from "../trpc"

export function publicProxyProcedure(namespace: string, method: string, inputSchema?: ZodTypeAny) {
  const base = inputSchema ? publicProcedure.input(inputSchema) : publicProcedure
  return base.mutation(async ({ ctx, input }) =>
    getHandler(ctx, namespace as never, method)(input, ctx)
  )
}

export function publicProxyQuery(namespace: string, method: string, inputSchema?: ZodTypeAny) {
  const base = inputSchema ? publicProcedure.input(inputSchema) : publicProcedure
  return base.query(async ({ ctx, input }) =>
    getHandler(ctx, namespace as never, method)(input, ctx)
  )
}

export function authedProxyProcedure(namespace: string, method: string, inputSchema?: ZodTypeAny) {
  const base = inputSchema ? authedProcedure.input(inputSchema) : authedProcedure
  return base.mutation(async ({ ctx, input }) =>
    getHandler(ctx, namespace as never, method)(input, ctx)
  )
}

export function authedProxyQuery(namespace: string, method: string, inputSchema?: ZodTypeAny) {
  const base = inputSchema ? authedProcedure.input(inputSchema) : authedProcedure
  return base.query(async ({ ctx, input }) =>
    getHandler(ctx, namespace as never, method)(input, ctx)
  )
}
