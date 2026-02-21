import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator"

export class CreateUserDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsIn(["platform_admin", "school_admin", "teacher", "student", "parent"])
  role?: "platform_admin" | "school_admin" | "teacher" | "student" | "parent"

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
