import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createEventSchema,
  eventsQuerySchema,
  updateEventSchema,
  userTenantQuerySchema,
  uuidStringSchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodParamFieldPipe } from "@/common/pipes/zod-param-field.pipe"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CalendarService } from "./calendar.service"
import { CreateEventDto, UpdateEventDto } from "./dto/create-event.dto"
import { EventQueryDto } from "./dto/event-query.dto"

@Controller("events")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  list(@Query(new ZodValidationPipe(eventsQuerySchema)) queryInput: unknown) {
    const query = queryInput as EventQueryDto
    return this.calendarService.list(query)
  }

  @Get(":id")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  getById(
    @Param("id", new ZodParamFieldPipe(uuidStringSchema)) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.calendarService.getById(query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin", "teacher")
  create(@Body(new ZodValidationPipe(createEventSchema)) bodyInput: unknown) {
    const body = bodyInput as CreateEventDto
    return this.calendarService.create(body)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  update(
    @Param("id", new ZodParamFieldPipe(uuidStringSchema)) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(updateEventSchema)) bodyInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const body = bodyInput as UpdateEventDto
    return this.calendarService.update(query.tenantId, id, body)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  delete(
    @Param("id", new ZodParamFieldPipe(uuidStringSchema)) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    return this.calendarService.delete(query.tenantId, id)
  }
}
