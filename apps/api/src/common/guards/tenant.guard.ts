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
    const roles = new Set(req.user?.roles ?? [])
    const isPlatformAdmin = roles.has("platform_admin")

    if (isPlatformAdmin) {
      return true
    }

    if (!userTenantId) {
      throw new ForbiddenException("Authenticated tenant is required")
    }

    if (!requestTenantId) {
      throw new ForbiddenException("Tenant context is required")
    }

    if (requestTenantId !== userTenantId) {
      throw new ForbiddenException("Tenant mismatch")
    }

    return true
  }
}
