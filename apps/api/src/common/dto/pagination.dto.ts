import { Type } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator"

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20

  @IsString()
  @IsOptional()
  search?: string

  @IsString()
  @IsOptional()
  sort?: string

  @IsIn(["asc", "desc"])
  @IsOptional()
  order: "asc" | "desc" = "desc"
}
