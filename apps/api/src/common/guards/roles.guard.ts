import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import type { CurrentUser } from "../decorators/current-user.decorator"
import { ROLES_KEY } from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles?.length) {
      return true
    }

    const req = context.switchToHttp().getRequest<{ user?: CurrentUser }>()
    const userRoles = req.user?.roles ?? []

    const allowed = requiredRoles.some((role) => userRoles.includes(role))
    if (!allowed) {
      throw new ForbiddenException("Insufficient role")
    }

    return true
  }
}
