import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"

class ExamResultRecordDto {
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
  @MaxLength(20)
  rank?: string
}

export class EnterExamResultsDto {
  @IsUUID()
  tenantId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamResultRecordDto)
  records!: ExamResultRecordDto[]
}
