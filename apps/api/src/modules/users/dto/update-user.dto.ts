import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator"

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsIn(["platform_admin", "school_admin", "teacher", "student", "parent"])
  role?: "platform_admin" | "school_admin" | "teacher" | "student" | "parent"

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
