import { Type } from "class-transformer"
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator"

export class CreateTeacherDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  userId!: string

  @IsString()
  @MinLength(2)
  employeeId!: string

  @IsIn(["male", "female"])
  gender!: "male" | "female"

  @IsDateString()
  joinDate!: string

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
