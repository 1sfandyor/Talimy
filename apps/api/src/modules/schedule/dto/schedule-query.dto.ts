import { IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ScheduleQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsUUID()
  subjectId?: string

  @IsOptional()
  @IsUUID()
  teacherId?: string

  @IsOptional()
  @IsIn(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
  dayOfWeek?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
}
