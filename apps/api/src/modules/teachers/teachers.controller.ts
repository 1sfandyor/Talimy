import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common"
import {
  createTeacherSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from "@/common/decorators/current-user.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { GenderGuard } from "@/common/guards/gender.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"
import { PermifyPdpService } from "../authz/permify/permify-pdp.service"

import { CreateTeacherDto } from "./dto/create-teacher.dto"
import { ListTeachersQueryDto } from "./dto/list-teachers-query.dto"
import { UpdateTeacherDto } from "./dto/update-teacher.dto"
import { TeachersService } from "./teachers.service"

@Controller("teachers")
@UseGuards(AuthGuard, RolesGuard, TenantGuard, GenderGuard)
@Roles("platform_admin", "school_admin")
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly permifyPdpService: PermifyPdpService
  ) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listTeachersQuerySchema))
  async list(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query() query: ListTeachersQueryDto
  ) {
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: query.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "list",
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      query.gender = currentUser.genderScope
    }
    return this.teachersService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getById(tenantId, id)
  }

  @Get(":id/schedule")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  schedule(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getSchedule(tenantId, id)
  }

  @Get(":id/classes")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  classes(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getClasses(tenantId, id)
  }

  @Get(":id/subjects")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  subjects(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.getSubjects(tenantId, id)
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createTeacherSchema))
  async create(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Body() payload: CreateTeacherDto
  ) {
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: payload.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "create",
        targetGender: payload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      if (payload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.teachersService.create(payload)
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateTeacherSchema))
  async update(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateTeacherDto
  ) {
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "update",
        targetGender: payload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all" && payload.gender) {
      if (payload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.teachersService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.teachersService.delete(tenantId, id)
  }
}
