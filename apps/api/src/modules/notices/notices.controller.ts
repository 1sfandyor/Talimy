import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common"
import { createNoticeSchema, noticesQuerySchema, updateNoticeSchema, userTenantQuerySchema } from "@talimy/shared"

import { CurrentUser, type CurrentUser as CurrentUserPayload } from "@/common/decorators/current-user.decorator"
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

  @Get()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  @UsePipes(new ZodValidationPipe(noticesQuerySchema))
  list(@CurrentUser() user: CurrentUserPayload | null, @Query() query: NoticeQueryDto) {
    return this.noticesService.list(this.requireUser(user), query)
  }

  @Get(":id")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  getById(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.noticesService.getById(this.requireUser(user), query.tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin", "teacher")
  create(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(createNoticeSchema)) payload: CreateNoticeDto
  ) {
    return this.noticesService.create(this.requireUser(user), payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string },
    @Body(new ZodValidationPipe(updateNoticeSchema)) payload: UpdateNoticeDto
  ) {
    return this.noticesService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  delete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.noticesService.delete(query.tenantId, id)
  }

  private requireUser(user: CurrentUserPayload | null): CurrentUserPayload {
    if (!user) {
      throw new UnauthorizedException("Authenticated user is required")
    }

    return user
  }
}
