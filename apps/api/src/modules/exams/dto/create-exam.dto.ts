import { Type } from "class-transformer"
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator"

const EXAM_TYPES = ["midterm", "final", "quiz", "custom"] as const

export class CreateExamDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MaxLength(150)
  name!: string

  @IsString()
  @IsIn(EXAM_TYPES)
  type!: (typeof EXAM_TYPES)[number]

  @IsUUID()
  subjectId!: string

  @IsUUID()
  classId!: string

  @IsDateString()
  date!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalMarks!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration!: number
}

export class UpdateExamDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string

  @IsOptional()
  @IsString()
  @IsIn(EXAM_TYPES)
  type?: (typeof EXAM_TYPES)[number]

  @IsOptional()
  @IsUUID()
  subjectId?: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalMarks?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number
}
