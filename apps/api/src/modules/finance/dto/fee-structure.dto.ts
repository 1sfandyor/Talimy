import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator"

export class CreateFeeStructureDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MaxLength(120)
  name!: string

  @IsNumber()
  @Min(0)
  amount!: number

  @IsOptional()
  @IsIn(["monthly", "termly", "yearly"])
  frequency?: "monthly" | "termly" | "yearly"

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}

export class UpdateFeeStructureDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @IsOptional()
  @IsIn(["monthly", "termly", "yearly"])
  frequency?: "monthly" | "termly" | "yearly"

  @IsOptional()
  @IsUUID()
  classId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null
}
