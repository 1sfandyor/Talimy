import { IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

type NoticeTargetRole = "all" | "teachers" | "students" | "parents"
type NoticePriority = "low" | "medium" | "high" | "urgent"
type AudienceRole = "teachers" | "students" | "parents"

export class NoticeQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsIn(["all", "teachers", "students", "parents"])
  targetRole?: NoticeTargetRole

  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: NoticePriority

  @IsOptional()
  @IsIn(["teachers", "students", "parents"])
  role?: AudienceRole
}

