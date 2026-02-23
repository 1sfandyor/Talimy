import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from "@nestjs/common"
import {
  createScheduleSchema,
  scheduleQuerySchema,
  updateScheduleSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateScheduleDto, UpdateScheduleDto } from "./dto/create-schedule.dto"
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

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createScheduleSchema)) payload: CreateScheduleDto) {
    return this.scheduleService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Body(new ZodValidationPipe(updateScheduleSchema)) payload: UpdateScheduleDto
  ) {
    return this.scheduleService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(@Param("id") id: string, @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }) {
    return this.scheduleService.delete(query.tenantId, id)
  }
}
