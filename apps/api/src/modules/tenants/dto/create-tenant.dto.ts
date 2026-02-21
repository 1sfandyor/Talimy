import { IsIn, IsString, MinLength } from "class-validator"

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsString()
  @MinLength(2)
  slug!: string

  @IsIn(["boys_only", "girls_only", "mixed"])
  genderPolicy!: "boys_only" | "girls_only" | "mixed"
}
