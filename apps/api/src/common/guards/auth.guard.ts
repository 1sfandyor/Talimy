import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"

import { AuthService } from "../../modules/auth/auth.service"

import type { CurrentUser } from "../decorators/current-user.decorator"

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
      user?: CurrentUser
      tenantId?: string
    }>()

    const authorization = this.readHeader(req.headers, "authorization")
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length).trim()
      const payload = this.authService.verifyAccessToken(token)
      req.user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        roles: payload.roles,
        genderScope: payload.genderScope,
      }
      req.tenantId = payload.tenantId
      return true
    }

    const userId = this.readHeader(req.headers, "x-user-id")
    if (!userId) {
      throw new UnauthorizedException("Missing authentication header")
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
