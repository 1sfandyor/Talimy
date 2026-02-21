import { IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListParentsQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  studentId?: string
}
