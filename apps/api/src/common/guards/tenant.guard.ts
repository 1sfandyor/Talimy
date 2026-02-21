import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"

import type { CurrentUser } from "../decorators/current-user.decorator"

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      tenantId?: string
      user?: CurrentUser
      params?: { tenantId?: string }
      query?: { tenantId?: string }
      body?: { tenantId?: string }
    }>()

    const requestTenantId =
      req.params?.tenantId ?? req.query?.tenantId ?? req.body?.tenantId ?? req.tenantId
    const userTenantId = req.user?.tenantId

    if (!requestTenantId || !userTenantId) {
      return true
    }

    if (requestTenantId !== userTenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }

    return true
  }
}
