import { Injectable, type NestMiddleware } from "@nestjs/common"
type NextFunction = () => void
type ResponseLike = object
type TenantRequest = {
  headers: Record<string, string | string[] | undefined>
  tenantId?: string
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: ResponseLike, next: NextFunction): void {
    const headerTenantId = req.headers["x-tenant-id"]
    const tenantFromHeader = Array.isArray(headerTenantId) ? headerTenantId[0] : headerTenantId

    if (tenantFromHeader) {
      req.tenantId = tenantFromHeader
      next()
      return
    }

    const host = (req.headers["x-forwarded-host"] ?? req.headers.host ?? "")
      .toString()
      .toLowerCase()
    const subdomain = host.split(".")[0]

    if (subdomain && !["www", "api", "platform", "localhost"].includes(subdomain)) {
      req.tenantId = subdomain
    }

    next()
  }
}
