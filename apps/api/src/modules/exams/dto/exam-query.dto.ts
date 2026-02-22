import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ExamQueryDto extends PaginationDto {
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
  studentId?: string

  @IsOptional()
  @IsUUID()
  examId?: string

  @IsOptional()
  @IsIn(["midterm", "final", "quiz", "custom"])
  type?: "midterm" | "final" | "quiz" | "custom"

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string
}
