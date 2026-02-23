import { IsDateString, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class AssignmentQueryDto extends PaginationDto {
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
  @IsUUID()
  studentId?: string

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string

  @IsOptional()
  @IsDateString()
  dueDateTo?: string
}
