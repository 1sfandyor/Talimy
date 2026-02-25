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
  async list(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query(new ZodValidationPipe(listTeachersQuerySchema)) query: unknown
  ) {
    const listQuery = query as ListTeachersQueryDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: listQuery.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "list",
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      listQuery.gender = currentUser.genderScope
    }
    return this.teachersService.list(listQuery)
  }

  @Get(":id")
  getById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    const tenantQuery = query as { tenantId: string }
    return this.teachersService.getById(tenantQuery.tenantId, id)
  }

  @Get(":id/schedule")
  schedule(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    const tenantQuery = query as { tenantId: string }
    return this.teachersService.getSchedule(tenantQuery.tenantId, id)
  }

  @Get(":id/classes")
  classes(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    const tenantQuery = query as { tenantId: string }
    return this.teachersService.getClasses(tenantQuery.tenantId, id)
  }

  @Get(":id/subjects")
  subjects(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    const tenantQuery = query as { tenantId: string }
    return this.teachersService.getSubjects(tenantQuery.tenantId, id)
  }

  @Post()
  async create(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Body(new ZodValidationPipe(createTeacherSchema)) payload: unknown
  ) {
    const createPayload = payload as CreateTeacherDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: createPayload.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "create",
        targetGender: createPayload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      if (createPayload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.teachersService.create(createPayload)
  }

  @Patch(":id")
  async update(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTeacherSchema)) payload: unknown
  ) {
    const tenantQuery = query as { tenantId: string }
    const updatePayload = payload as UpdateTeacherDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: tenantQuery.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "teacher",
        action: "update",
        targetGender: updatePayload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all" && updatePayload.gender) {
      if (updatePayload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.teachersService.update(tenantQuery.tenantId, id, updatePayload)
  }

  @Delete(":id")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: unknown,
    @Param("id") id: string
  ) {
    const tenantQuery = query as { tenantId: string }
    return this.teachersService.delete(tenantQuery.tenantId, id)
  }
}
