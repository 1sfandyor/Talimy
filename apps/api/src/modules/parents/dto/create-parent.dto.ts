import { IsArray, IsOptional, IsString, IsUUID, MinLength } from "class-validator"

export class CreateParentDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  userId!: string

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

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  studentIds?: string[]
}
