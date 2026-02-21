import { IsString, IsUrl, MaxLength } from "class-validator"

export class UpdateUserAvatarDto {
  @IsString()
  @IsUrl()
  @MaxLength(500)
  avatar!: string
}
