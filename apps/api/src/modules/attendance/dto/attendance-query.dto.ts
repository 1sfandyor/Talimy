import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class AttendanceQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsUUID()
  studentId?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @IsIn(["present", "absent", "late", "excused"])
  status?: "present" | "absent" | "late" | "excused"
}
