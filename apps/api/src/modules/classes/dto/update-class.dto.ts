import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from "class-validator"

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  grade?: string

  @IsOptional()
  @IsString()
  section?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number

  @IsOptional()
  @IsUUID()
  academicYearId?: string
}
