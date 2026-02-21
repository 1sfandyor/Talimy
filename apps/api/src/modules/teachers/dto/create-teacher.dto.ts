import { IsIn, IsString, IsUUID, MinLength } from "class-validator"

export class CreateTeacherDto {
  @IsUUID()
  tenantId!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsString()
  @MinLength(2)
  employeeId!: string

  @IsIn(["male", "female"])
  gender!: "male" | "female"
}
