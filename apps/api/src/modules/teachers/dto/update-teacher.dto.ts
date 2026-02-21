import { IsIn, IsOptional, IsString, MinLength } from "class-validator"

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female"
}
