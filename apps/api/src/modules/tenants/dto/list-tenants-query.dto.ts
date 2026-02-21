import { IsIn, IsOptional } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListTenantsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive"

  @IsOptional()
  @IsIn(["free", "basic", "premium", "enterprise"])
  billingPlan?: "free" | "basic" | "premium" | "enterprise"
}
