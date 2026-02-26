export type RouterHandlerMap = Record<
  string,
  (input: unknown, ctx: TrpcContext) => Promise<unknown>
>

export type TrpcRouterHandlers = Partial<{
  auth: RouterHandlerMap
  tenant: RouterHandlerMap
  teacher: RouterHandlerMap
  student: RouterHandlerMap
  parent: RouterHandlerMap
  attendance: RouterHandlerMap
  grade: RouterHandlerMap
  exam: RouterHandlerMap
  assignment: RouterHandlerMap
  finance: RouterHandlerMap
  notification: RouterHandlerMap
  schedule: RouterHandlerMap
  ai: RouterHandlerMap
}>

export type TrpcSessionUser = {
  id: string
  tenantId?: string
  roles?: string[]
}

export type TrpcContext = {
  requestId?: string
  user?: TrpcSessionUser | null
  handlers: TrpcRouterHandlers
}

export function createTrpcContext(input?: Partial<TrpcContext>): TrpcContext {
  return {
    requestId: input?.requestId,
    user: input?.user ?? null,
    handlers: input?.handlers ?? {},
  }
}
