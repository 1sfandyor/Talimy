import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

export type CurrentUser = {
  id: string
  tenantId?: string
  roles?: string[]
  genderScope?: "male" | "female" | "all"
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>()
    return req.user ?? null
  }
)
