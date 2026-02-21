import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"

import type { CurrentUser } from "../decorators/current-user.decorator"

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
      user?: CurrentUser
      tenantId?: string
    }>()

    const userId = this.readHeader(req.headers, "x-user-id")
    if (!userId) {
      throw new UnauthorizedException("Missing authentication header x-user-id")
    }

    const tenantId = this.readHeader(req.headers, "x-tenant-id") ?? req.tenantId
    const rolesHeader = this.readHeader(req.headers, "x-user-roles")
    const genderScope = (this.readHeader(req.headers, "x-gender-scope") ?? "all") as
      | "male"
      | "female"
      | "all"

    req.user = {
      id: userId,
      tenantId,
      roles: rolesHeader
        ? rolesHeader
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [],
      genderScope,
    }

    return true
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string
  ): string | null {
    const raw = headers[key]
    if (Array.isArray(raw)) {
      return raw[0] ?? null
    }
    return raw ?? null
  }
}
