import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator"

type NoticeTargetRole = "all" | "teachers" | "students" | "parents"
type NoticePriority = "low" | "medium" | "high" | "urgent"

export class CreateNoticeDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MaxLength(255)
  title!: string

  @IsString()
  @MaxLength(5000)
  content!: string

  @IsIn(["all", "teachers", "students", "parents"])
  targetRole!: NoticeTargetRole

  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: NoticePriority

  @IsOptional()
  @IsString()
  publishDate?: string

  @IsOptional()
  @IsString()
  expiryDate?: string
}

export class UpdateNoticeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string

  @IsOptional()
  @IsIn(["all", "teachers", "students", "parents"])
  targetRole?: NoticeTargetRole

  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: NoticePriority

  @IsOptional()
  @IsString()
  publishDate?: string

  @IsOptional()
  expiryDate?: string | null
}
