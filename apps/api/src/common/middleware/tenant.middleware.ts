import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  type NestMiddleware,
} from "@nestjs/common"

import { TenantsService } from "../../modules/tenants/tenants.service"

type NextFunction = (error?: unknown) => void
type ResponseLike = object
type TenantRequest = {
  headers: Record<string, string | string[] | undefined>
  tenantId?: string
  tenantSlug?: string
}

const RESERVED_SUBDOMAINS = new Set(["www", "api", "platform", "localhost"])

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: TenantRequest, _res: ResponseLike, next: NextFunction): Promise<void> {
    const headerTenantId = this.readHeaderValue(req.headers["x-tenant-id"])
    const headerTenantSlug = this.normalizeSlug(this.readHeaderValue(req.headers["x-tenant-slug"]))
    const hostTenantSlug = this.extractTenantSlugFromHost(
      this.readHeaderValue(req.headers["x-forwarded-host"] ?? req.headers.host)
    )

    if (headerTenantSlug && hostTenantSlug && headerTenantSlug !== hostTenantSlug) {
      throw new BadRequestException("Tenant slug mismatch")
    }

    const tenantSlug = headerTenantSlug ?? hostTenantSlug
    if (tenantSlug) {
      const resolved = await this.tenantsService.resolveTenantContextBySlug(tenantSlug)

      if (headerTenantId && headerTenantId !== resolved.tenantId) {
        throw new ForbiddenException("Tenant mismatch")
      }

      req.tenantId = resolved.tenantId
      req.tenantSlug = resolved.tenantSlug
      next()
      return
    }

    if (headerTenantId) {
      req.tenantId = headerTenantId
    }

    next()
  }

  private readHeaderValue(value: string | string[] | undefined): string | undefined {
    const rawValue = Array.isArray(value) ? value[0] : value
    if (typeof rawValue !== "string") {
      return undefined
    }

    const normalized = rawValue.trim()
    return normalized.length > 0 ? normalized : undefined
  }

  private normalizeSlug(slug: string | undefined): string | undefined {
    if (!slug) {
      return undefined
    }

    const normalized = slug.trim().toLowerCase()
    return normalized.length > 0 ? normalized : undefined
  }

  private extractTenantSlugFromHost(hostHeader: string | undefined): string | undefined {
    if (!hostHeader) {
      return undefined
    }

    const firstForwardedHost = hostHeader.split(",")[0]?.trim().toLowerCase()
    if (!firstForwardedHost) {
      return undefined
    }

    const hostWithoutPort = firstForwardedHost.split(":")[0]
    if (!hostWithoutPort || hostWithoutPort === "localhost") {
      return undefined
    }

    if (!hostWithoutPort.includes(".")) {
      return undefined
    }

    const subdomain = hostWithoutPort.split(".")[0]
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
      return undefined
    }

    return subdomain
  }
}
