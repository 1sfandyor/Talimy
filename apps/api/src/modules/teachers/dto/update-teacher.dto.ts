import { Type } from "class-transformer"
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MinLength } from "class-validator"

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  employeeId?: string

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female"

  @IsOptional()
  @IsDateString()
  joinDate?: string

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @IsOptional()
  @IsString()
  qualification?: string

  @IsOptional()
  @IsString()
  specialization?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number

  @IsOptional()
  @IsIn(["active", "inactive", "on_leave"])
  status?: "active" | "inactive" | "on_leave"
}
