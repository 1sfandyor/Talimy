import { Type } from "class-transformer"
import { IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator"

export class UpdateTenantBillingDto {
  @IsOptional()
  @IsIn(["free", "basic", "pro", "enterprise"])
  billingPlan?: "free" | "basic" | "pro" | "enterprise"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  studentLimit?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  adminLimit?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice?: number

  @IsOptional()
  @IsString()
  @MinLength(3)
  currency?: string
}
