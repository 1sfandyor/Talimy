import { IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListTeachersQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female"

  @IsOptional()
  @IsIn(["active", "inactive", "on_leave"])
  status?: "active" | "inactive" | "on_leave"
}
