import { IsIn } from "class-validator"

export class UpdateUserRoleDto {
  @IsIn(["platform_admin", "school_admin", "teacher", "student", "parent"])
  role!: "platform_admin" | "school_admin" | "teacher" | "student" | "parent"
}
