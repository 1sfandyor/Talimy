import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createScheduleSchema,
  scheduleQuerySchema,
  updateScheduleSchema,
  userTenantQuerySchema,
} from "@talimy/shared"
import { z } from "zod"

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
  list(@Query(new ZodValidationPipe(scheduleQuerySchema)) queryInput: unknown) {
    const query = queryInput as ScheduleQueryDto
    return this.scheduleService.list(query)
  }

  @Get(":id")
  getById(
    @Param("id", new ZodValidationPipe(z.string().uuid())) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.scheduleService.getById(query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createScheduleSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateScheduleDto
    return this.scheduleService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Param("id", new ZodValidationPipe(z.string().uuid())) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(updateScheduleSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateScheduleDto
    return this.scheduleService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(
    @Param("id", new ZodValidationPipe(z.string().uuid())) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.scheduleService.delete(query.tenantId, id)
  }
}
