import { IsIn, IsOptional, IsUUID } from "class-validator"

import { PaginationDto } from "@/common/dto/pagination.dto"

export class ListUsersQueryDto extends PaginationDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsIn(["platform_admin", "school_admin", "teacher", "student", "parent"])
  role?: "platform_admin" | "school_admin" | "teacher" | "student" | "parent"

  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive"
}
