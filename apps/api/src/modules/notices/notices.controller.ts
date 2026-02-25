import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common"
import {
  createNoticeSchema,
  noticesQuerySchema,
  updateNoticeSchema,
  userTenantQuerySchema,
} from "@talimy/shared"
import { z } from "zod"

import {
  CurrentUser,
  type CurrentUser as CurrentUserPayload,
} from "@/common/decorators/current-user.decorator"
import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateNoticeDto, UpdateNoticeDto } from "./dto/create-notice.dto"
import { NoticeQueryDto } from "./dto/notice-query.dto"
import { NoticesService } from "./notices.service"

@Controller("notices")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}
  private static readonly idValueSchema = z.string().uuid()

  @Get()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  list(
    @CurrentUser() user: CurrentUserPayload | null,
    @Query(new ZodValidationPipe(noticesQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as NoticeQueryDto
    return this.noticesService.list(this.requireUser(user), query)
  }

  @Get(":id")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  getById(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param("id") idInput: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const id = NoticesController.idValueSchema.parse(idInput)
    const query = queryInput as { tenantId: string }
    return this.noticesService.getById(this.requireUser(user), query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin", "teacher")
  create(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(createNoticeSchema)) payloadInput: unknown
  ) {
    const payload = payloadInput as CreateNoticeDto
    return this.noticesService.create(this.requireUser(user), payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  update(
    @Param("id") idInput: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Body(new ZodValidationPipe(updateNoticeSchema)) payloadInput: unknown
  ) {
    const id = NoticesController.idValueSchema.parse(idInput)
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateNoticeDto
    return this.noticesService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  delete(
    @Param("id") idInput: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown
  ) {
    const id = NoticesController.idValueSchema.parse(idInput)
    const query = queryInput as { tenantId: string }
    return this.noticesService.delete(query.tenantId, id)
  }

  private requireUser(user: CurrentUserPayload | null): CurrentUserPayload {
    if (!user) {
      throw new UnauthorizedException("Authenticated user is required")
    }

    return user
  }
}
