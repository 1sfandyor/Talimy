import { IsOptional, IsString, MinLength } from "class-validator"

export class UpdateParentDto {
  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  occupation?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  relationship?: string
}
