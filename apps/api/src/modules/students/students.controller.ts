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
  createStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
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

import { CreateStudentDto } from "./dto/create-student.dto"
import { ListStudentsQueryDto } from "./dto/list-students-query.dto"
import { UpdateStudentDto } from "./dto/update-student.dto"
import { StudentsService } from "./students.service"

@Controller("students")
@UseGuards(AuthGuard, RolesGuard, TenantGuard, GenderGuard)
@Roles("platform_admin", "school_admin", "teacher")
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly permifyPdpService: PermifyPdpService
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query(new ZodValidationPipe(listStudentsQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as ListStudentsQueryDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: query.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "student",
        action: "list",
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      query.gender = currentUser.genderScope
    }
    return this.studentsService.list(query)
  }

  @Get(":id")
  getById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.getById(query.tenantId, id)
  }

  @Get(":id/grades")
  grades(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.getGrades(query.tenantId, id)
  }

  @Get(":id/attendance")
  attendance(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.getAttendance(query.tenantId, id)
  }

  @Get(":id/parents")
  parents(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.getParents(query.tenantId, id)
  }

  @Get(":id/summary")
  summary(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.getSummary(query.tenantId, id)
  }

  @Post()
  async create(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Body(new ZodValidationPipe(createStudentSchema)) payloadInput: unknown
  ) {
    const payload = payloadInput as CreateStudentDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: payload.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "student",
        action: "create",
        targetGender: payload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all") {
      if (payload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.studentsService.create(payload)
  }

  @Patch(":id")
  async update(
    @CurrentUser() currentUser: CurrentUserType | null,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateStudentDto
    if (currentUser && currentUser.roles?.includes("school_admin")) {
      await this.permifyPdpService.assertGenderAccess({
        tenantId: query.tenantId,
        userId: currentUser.id,
        roles: currentUser.roles ?? [],
        userGenderScope: currentUser.genderScope ?? "all",
        entity: "student",
        action: "update",
        targetGender: payload.gender,
      })
    }
    if (currentUser?.genderScope && currentUser.genderScope !== "all" && payload.gender) {
      if (payload.gender !== currentUser.genderScope) {
        throw new ForbiddenException("Gender scope mismatch")
      }
    }
    return this.studentsService.update(query.tenantId, id, payload)
  }

  @Delete(":id")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.studentsService.delete(query.tenantId, id)
  }
}
