import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"
import { Observable } from "rxjs"
import { tap } from "rxjs/operators"

import { AuditService } from "./audit.service"
import {
  auditResourceFromPath,
  extractAuditRequest,
  sanitizeAuditData,
  shouldAuditMethod,
  shouldSkipAudit,
} from "./audit.utils"

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name)

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle()

    const req = extractAuditRequest(context)
    const method = req.method?.toUpperCase()
    if (!shouldAuditMethod(method) || shouldSkipAudit(req.url)) {
      return next.handle()
    }

    const actor = req.user
    const tenantId =
      typeof req.body === "object" &&
      req.body &&
      "tenantId" in (req.body as Record<string, unknown>)
        ? ((req.body as Record<string, unknown>).tenantId as string | undefined)
        : actor?.tenantId

    if (!tenantId) return next.handle()

    const action = this.resolveAction(method)
    const resource = auditResourceFromPath(req.url)
    const resourceId = typeof req.params?.id === "string" ? req.params.id : null
    const newData = sanitizeAuditData(req.body)
    const ipAddress = req.ip ?? null

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService
            .log({
              tenantId,
              userId: actor?.id ?? null,
              action,
              resource,
              resourceId,
              newData,
              ipAddress,
            })
            .catch((error) => {
              this.logger.error(
                `Failed to write audit log: ${error instanceof Error ? error.message : "unknown error"}`
              )
            })
        },
      })
    )
  }

  private resolveAction(method: string | undefined): string {
    switch (method) {
      case "POST":
        return "create"
      case "PATCH":
        return "update"
      case "PUT":
        return "replace"
      case "DELETE":
        return "delete"
      default:
        return "write"
    }
  }
}
