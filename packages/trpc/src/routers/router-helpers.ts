import type { ZodTypeAny } from "zod"

import type { TrpcHandlerNamespace } from "../context"
import { getHandler, publicProcedure, tenantAuthedProcedure } from "../trpc"

export function publicProxyProcedure(
  namespace: TrpcHandlerNamespace,
  method: string,
  inputSchema?: ZodTypeAny
) {
  const base = inputSchema ? publicProcedure.input(inputSchema) : publicProcedure
  return base.mutation(async ({ ctx, input }) => getHandler(ctx, namespace, method)(input, ctx))
}

export function publicProxyQuery(
  namespace: TrpcHandlerNamespace,
  method: string,
  inputSchema?: ZodTypeAny
) {
  const base = inputSchema ? publicProcedure.input(inputSchema) : publicProcedure
  return base.query(async ({ ctx, input }) => getHandler(ctx, namespace, method)(input, ctx))
}

export function authedProxyProcedure(
  namespace: TrpcHandlerNamespace,
  method: string,
  inputSchema?: ZodTypeAny
) {
  const base = inputSchema ? tenantAuthedProcedure.input(inputSchema) : tenantAuthedProcedure
  return base.mutation(async ({ ctx, input }) => getHandler(ctx, namespace, method)(input, ctx))
}

export function authedProxyQuery(
  namespace: TrpcHandlerNamespace,
  method: string,
  inputSchema?: ZodTypeAny
) {
  const base = inputSchema ? tenantAuthedProcedure.input(inputSchema) : tenantAuthedProcedure
  return base.query(async ({ ctx, input }) => getHandler(ctx, namespace, method)(input, ctx))
}
