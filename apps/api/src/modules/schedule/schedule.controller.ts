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
import { CacheService } from "../cache/cache.service"
import {
  CACHE_TTLS,
  scheduleCachePrefix,
  scheduleItemCacheKey,
  scheduleListCacheKey,
} from "../cache/cache.keys"

@Controller("schedule")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly cacheService: CacheService
  ) {}
  private static readonly idParamSchema = z.object({ id: z.string().uuid() })

  @Get()
  list(@Query(new ZodValidationPipe(scheduleQuerySchema)) queryInput: unknown) {
    const query = queryInput as ScheduleQueryDto
    const key = scheduleListCacheKey(query.tenantId, this.hashQuery(query))
    return this.cacheService.wrapJson(key, CACHE_TTLS.scheduleListSeconds, () =>
      this.scheduleService.list(query)
    )
  }

  @Get(":id")
  getById(
    @Param(new ZodValidationPipe(ScheduleController.idParamSchema)) paramsInput: unknown,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    const key = scheduleItemCacheKey(query.tenantId, params.id)
    return this.cacheService.wrapJson(key, CACHE_TTLS.scheduleItemSeconds, () =>
      this.scheduleService.getById(query.tenantId, params.id)
    )
  }

  @Post()
  @Roles("platform_admin", "school_admin")
  create(@Body(new ZodValidationPipe(createScheduleSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateScheduleDto
    return this.scheduleService.create(payload).then(async (created) => {
      await this.cacheService.delByPrefix(scheduleCachePrefix(payload.tenantId))
      return created
    })
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin")
  update(
    @Param(new ZodValidationPipe(ScheduleController.idParamSchema)) paramsInput: unknown,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(updateScheduleSchema)) payloadInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateScheduleDto
    return this.scheduleService.update(query.tenantId, params.id, payload).then(async (updated) => {
      await this.cacheService.delByPrefix(scheduleCachePrefix(query.tenantId))
      return updated
    })
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin")
  delete(
    @Param(new ZodValidationPipe(ScheduleController.idParamSchema)) paramsInput: unknown,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const params = paramsInput as { id: string }
    const query = queryInput as { tenantId: string }
    return this.scheduleService.delete(query.tenantId, params.id).then(async (result) => {
      await this.cacheService.delByPrefix(scheduleCachePrefix(query.tenantId))
      return result
    })
  }

  private hashQuery(query: ScheduleQueryDto): string {
    return Buffer.from(JSON.stringify(query)).toString("base64url")
  }
}
