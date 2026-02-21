import { IsIn, IsOptional, IsString, MinLength } from "class-validator"

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsIn(["boys_only", "girls_only", "mixed"])
  genderPolicy?: "boys_only" | "girls_only" | "mixed"
}
