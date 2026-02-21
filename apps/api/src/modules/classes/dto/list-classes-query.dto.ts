import { IsOptional, IsString, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListClassesQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsString()
  grade?: string

  @IsOptional()
  @IsString()
  section?: string

  @IsOptional()
  @IsUUID()
  academicYearId?: string
}
