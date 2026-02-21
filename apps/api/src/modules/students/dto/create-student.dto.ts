import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator"

export class CreateStudentDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  userId!: string

  @IsUUID()
  @IsOptional()
  classId?: string

  @IsString()
  @MinLength(2)
  studentId!: string

  @IsDateString()
  enrollmentDate!: string

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @IsOptional()
  @IsString()
  bloodGroup?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsIn(["active", "inactive", "graduated", "transferred"])
  @IsOptional()
  status?: "active" | "inactive" | "graduated" | "transferred"

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsIn(["male", "female"])
  gender!: "male" | "female"
}
