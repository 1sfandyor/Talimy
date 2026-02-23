import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator"

const DAY_OF_WEEK_VALUES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export class CreateScheduleDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  classId!: string

  @IsUUID()
  subjectId!: string

  @IsUUID()
  teacherId!: string

  @IsIn(DAY_OF_WEEK_VALUES)
  dayOfWeek!: (typeof DAY_OF_WEEK_VALUES)[number]

  @IsString()
  @Matches(TIME_REGEX)
  startTime!: string

  @IsString()
  @Matches(TIME_REGEX)
  endTime!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsUUID()
  classId?: string

  @IsOptional()
  @IsUUID()
  subjectId?: string

  @IsOptional()
  @IsUUID()
  teacherId?: string

  @IsOptional()
  @IsIn(DAY_OF_WEEK_VALUES)
  dayOfWeek?: (typeof DAY_OF_WEEK_VALUES)[number]

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  startTime?: string

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  endTime?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string | null
}
