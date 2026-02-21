import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from "class-validator"

export class CreateClassDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(1)
  grade!: string

  @IsOptional()
  @IsString()
  section?: string

  @IsInt()
  @Min(1)
  @Max(200)
  capacity!: number

  @IsUUID()
  academicYearId!: string
}
