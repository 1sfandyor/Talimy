import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<{ tenantId?: string }>()
    return req.tenantId ?? null
  }
)
