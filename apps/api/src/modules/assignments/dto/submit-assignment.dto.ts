import { Type } from "class-transformer"
import { IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from "class-validator"

export class SubmitAssignmentDto {
  @IsUUID()
  studentId!: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  @IsUrl()
  fileUrl?: string
}

export class GradeAssignmentSubmissionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score!: number

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string
}
