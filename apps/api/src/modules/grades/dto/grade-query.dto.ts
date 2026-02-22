import { IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class GradeQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  studentId?: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsUUID()
  subjectId?: string

  @IsOptional()
  @IsUUID()
  termId?: string

  @IsOptional()
  @IsUUID()
  teacherId?: string
}
