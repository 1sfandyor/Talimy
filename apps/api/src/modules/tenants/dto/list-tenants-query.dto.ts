import { IsIn, IsOptional } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListTenantsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(["active", "inactive", "suspended"])
  status?: "active" | "inactive" | "suspended"

  @IsOptional()
  @IsIn(["free", "basic", "pro", "enterprise"])
  billingPlan?: "free" | "basic" | "pro" | "enterprise"
}
