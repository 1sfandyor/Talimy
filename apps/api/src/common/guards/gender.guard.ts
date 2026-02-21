import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { GENDER_SCOPE_KEY, type GenderScope } from "../decorators/gender-scope.decorator"
import type { CurrentUser } from "../decorators/current-user.decorator"

@Injectable()
export class GenderGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<GenderScope | undefined>(
      GENDER_SCOPE_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (!requiredScope || requiredScope === "all") {
      return true
    }

    const req = context.switchToHttp().getRequest<{ user?: CurrentUser }>()
    const userScope = req.user?.genderScope ?? "all"

    if (userScope !== "all" && userScope !== requiredScope) {
      throw new ForbiddenException("Gender scope mismatch")
    }

    return true
  }
}
