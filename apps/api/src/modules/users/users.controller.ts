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
  UsePipes,
} from "@nestjs/common"
import {
  createUserSchema,
  listUsersQuerySchema,
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
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersService } from "./users.service"

@Controller("users")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listUsersQuerySchema))
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.usersService.getById(tenantId, id)
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createUserSchema))
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload)
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateUserDto
  ) {
    return this.usersService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.usersService.delete(tenantId, id)
  }
}
