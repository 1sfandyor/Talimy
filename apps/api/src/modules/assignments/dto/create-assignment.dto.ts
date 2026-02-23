import { Type } from "class-transformer"
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator"

export class CreateAssignmentDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  teacherId!: string

  @IsUUID()
  subjectId!: string

  @IsUUID()
  classId!: string

  @IsString()
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsDateString()
  dueDate!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalPoints!: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl()
  fileUrl?: string
}

export class UpdateAssignmentDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  teacherId?: string

  @IsOptional()
  @IsUUID()
  subjectId?: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalPoints?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl()
  fileUrl?: string | null
}
