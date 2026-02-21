import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator"

export class CreateUserDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  role?: string
}
