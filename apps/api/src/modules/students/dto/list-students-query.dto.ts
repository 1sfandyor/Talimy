import { IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListStudentsQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female"

  @IsOptional()
  @IsIn(["active", "inactive", "graduated", "transferred"])
  status?: "active" | "inactive" | "graduated" | "transferred"
}
