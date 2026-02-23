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
  UsePipes,
} from "@nestjs/common"
import {
  markNotificationReadSchema,
  notificationScopeQuerySchema,
  notificationsQuerySchema,
  sendNotificationSchema,
} from "@talimy/shared"

import { CurrentUser, type CurrentUser as CurrentUserPayload } from "@/common/decorators/current-user.decorator"
import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
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
  @UsePipes(new ZodValidationPipe(notificationsQuerySchema))
  list(@CurrentUser() user: CurrentUserPayload | null, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.list(this.requireUser(user), query)
  }

  @Get("unread-count")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  @UsePipes(new ZodValidationPipe(notificationScopeQuerySchema))
  unreadCount(
    @CurrentUser() user: CurrentUserPayload | null,
    @Query() query: NotificationScopeQueryDto
  ) {
    return this.notificationsService.getUnreadCount(this.requireUser(user), query)
  }

  @Post("send")
  @Roles("platform_admin", "school_admin", "teacher")
  @UsePipes(new ZodValidationPipe(sendNotificationSchema))
  send(@CurrentUser() user: CurrentUserPayload | null, @Body() body: SendNotificationDto) {
    return this.notificationsService.send(this.requireUser(user), body)
  }

  @Patch(":id/read")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  @UsePipes(new ZodValidationPipe(markNotificationReadSchema))
  markRead(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param("id") id: string,
    @Body() body: MarkNotificationReadDto
  ) {
    return this.notificationsService.markRead(this.requireUser(user), id, body)
  }

  private requireUser(user: CurrentUserPayload | null): CurrentUserPayload {
    if (!user) {
      throw new UnauthorizedException("Authenticated user is required")
    }

    return user
  }
}
