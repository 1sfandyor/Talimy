import { Type } from "class-transformer"
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator"

class AttendanceRecordDto {
  @IsUUID()
  studentId!: string

  @IsIn(["present", "absent", "late", "excused"])
  status!: "present" | "absent" | "late" | "excused"

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class MarkAttendanceDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  classId!: string

  @IsDateString()
  date!: string

  @IsOptional()
  @IsUUID()
  markedBy?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[]
}
