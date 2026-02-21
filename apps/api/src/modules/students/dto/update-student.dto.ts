import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator"

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  studentId?: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @IsOptional()
  @IsString()
  bloodGroup?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsIn(["active", "inactive", "graduated", "transferred"])
  status?: "active" | "inactive" | "graduated" | "transferred"

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female"
}
