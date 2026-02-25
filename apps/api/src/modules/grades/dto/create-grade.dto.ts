import { Type } from "class-transformer"
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator"

class GradeEntryRecordDto {
  @IsUUID()
  studentId!: string

  @Type(() => Number)
  @IsNumber()
  score!: number

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grade?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string
}

export class CreateGradeDto {
  @IsUUID()
  tenantId!: string

  @IsOptional()
  @IsUUID()
  classId?: string

  @IsUUID()
  subjectId!: string

  @IsUUID()
  termId!: string

  @IsOptional()
  @IsUUID()
  teacherId?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEntryRecordDto)
  records!: GradeEntryRecordDto[]
}

export class CreateGradeScaleDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MaxLength(100)
  name!: string

  @Type(() => Number)
  @IsNumber()
  minScore!: number

  @Type(() => Number)
  @IsNumber()
  maxScore!: number

  @IsString()
  @MaxLength(10)
  grade!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpa?: number
}

export class UpdateGradeScaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minScore?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxScore?: number

  @IsOptional()
  @IsString()
  @MaxLength(10)
  grade?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gpa?: number | null
}
