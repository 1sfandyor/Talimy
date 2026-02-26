import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { auditLogsQuerySchema } from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { AuditService } from "./audit.service"
import { AuditLogsQueryDto } from "./dto/audit-query.dto"

@Controller("audit-logs")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query(new ZodValidationPipe(auditLogsQuerySchema)) queryInput: unknown) {
    const query = queryInput as AuditLogsQueryDto
    return this.auditService.list(query)
  }
}
