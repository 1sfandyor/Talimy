import { Controller, Get, Query, UseGuards, UsePipes } from "@nestjs/common"
import { scheduleQuerySchema } from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { ScheduleQueryDto } from "./dto/schedule-query.dto"
import { ScheduleService } from "./schedule.service"

@Controller("schedule")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(scheduleQuerySchema))
  list(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.list(query)
  }
}
