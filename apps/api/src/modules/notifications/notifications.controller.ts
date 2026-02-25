import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common"
import {
  markNotificationReadSchema,
  notificationScopeQuerySchema,
  notificationsQuerySchema,
  sendNotificationSchema,
  uuidStringSchema,
} from "@talimy/shared"

import {
  CurrentUser,
  type CurrentUser as CurrentUserPayload,
} from "@/common/decorators/current-user.decorator"
import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodParamFieldPipe } from "@/common/pipes/zod-param-field.pipe"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import {
  MarkNotificationReadDto,
  NotificationScopeQueryDto,
  NotificationsQueryDto,
  SendNotificationDto,
} from "./dto/send-notification.dto"
import { NotificationsService } from "./notifications.service"

@Controller("notifications")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  list(
    @CurrentUser() user: CurrentUserPayload | null,
    @Query(new ZodValidationPipe(notificationsQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as NotificationsQueryDto
    return this.notificationsService.list(this.requireUser(user), query)
  }

  @Get("unread-count")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  unreadCount(
    @CurrentUser() user: CurrentUserPayload | null,
    @Query(new ZodValidationPipe(notificationScopeQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as NotificationScopeQueryDto
    return this.notificationsService.getUnreadCount(this.requireUser(user), query)
  }

  @Post("send")
  @Roles("platform_admin", "school_admin", "teacher")
  send(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(sendNotificationSchema)) bodyInput: unknown
  ) {
    const body = bodyInput as SendNotificationDto
    return this.notificationsService.send(this.requireUser(user), body)
  }

  @Patch(":id/read")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  markRead(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param("id", new ZodParamFieldPipe(uuidStringSchema)) id: string,
    @Body(new ZodValidationPipe(markNotificationReadSchema)) bodyInput: unknown
  ) {
    const body = bodyInput as MarkNotificationReadDto
    return this.notificationsService.markRead(this.requireUser(user), id, body)
  }

  private requireUser(user: CurrentUserPayload | null): CurrentUserPayload {
    if (!user) {
      throw new UnauthorizedException("Authenticated user is required")
    }

    return user
  }
}
