import { Type } from "class-transformer"
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

const NOTIFICATION_TYPES = ["info", "success", "warning", "error"] as const
const NOTIFICATION_CHANNELS = ["in_app", "email", "sms"] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export class SendNotificationDto {
  @IsUUID()
  tenantId!: string

  @IsArray()
  @IsUUID(undefined, { each: true })
  recipientUserIds!: string[]

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType

  @IsOptional()
  @IsArray()
  @IsIn(NOTIFICATION_CHANNELS, { each: true })
  channels?: NotificationChannel[]
}

export class NotificationsQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  userId?: string

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType

  @IsOptional()
  @IsIn(["true", "false"])
  unreadOnly?: "true" | "false"
}

export class NotificationScopeQueryDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  userId?: string
}

export class MarkNotificationReadDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @Type(() => Boolean)
  read?: boolean = true
}
