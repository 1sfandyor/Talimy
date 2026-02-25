import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  changeUserPasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateUserAvatarSchema,
  updateUserRoleSchema,
  updateUserSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateUserDto } from "./dto/create-user.dto"
import { ListUsersQueryDto } from "./dto/list-users-query.dto"
import { ChangeUserPasswordDto } from "./dto/change-user-password.dto"
import { UpdateUserAvatarDto } from "./dto/update-user-avatar.dto"
import { UpdateUserRoleDto } from "./dto/update-user-role.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersService } from "./users.service"

@Controller("users")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listUsersQuerySchema)) query: unknown) {
    return this.usersService.list(query as ListUsersQueryDto)
  }

  @Get(":id")
  getById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    return this.usersService.getById((query as { tenantId: string }).tenantId, id)
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) payload: unknown) {
    return this.usersService.create(payload as CreateUserDto)
  }

  @Patch(":id")
  update(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) payload: unknown
  ) {
    return this.usersService.update((query as { tenantId: string }).tenantId, id, payload as UpdateUserDto)
  }

  @Patch(":id/role")
  changeRole(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserRoleSchema)) payload: unknown
  ) {
    return this.usersService.changeRole(
      (query as { tenantId: string }).tenantId,
      id,
      payload as UpdateUserRoleDto
    )
  }

  @Patch(":id/password")
  changePassword(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(changeUserPasswordSchema)) payload: unknown
  ) {
    return this.usersService.changePassword(
      (query as { tenantId: string }).tenantId,
      id,
      payload as ChangeUserPasswordDto
    )
  }

  @Patch(":id/avatar")
  updateAvatar(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserAvatarSchema)) payload: unknown
  ) {
    return this.usersService.updateAvatar(
      (query as { tenantId: string }).tenantId,
      id,
      payload as UpdateUserAvatarDto
    )
  }

  @Delete(":id")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    return this.usersService.delete((query as { tenantId: string }).tenantId, id)
  }
}
