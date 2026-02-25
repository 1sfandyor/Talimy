import { Type } from "class-transformer"
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Matches,
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

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "joinDate must be YYYY-MM-DD" })
  joinDate!: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "dateOfBirth must be YYYY-MM-DD" })
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
