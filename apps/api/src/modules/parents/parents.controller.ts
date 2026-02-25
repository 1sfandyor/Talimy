import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  createParentSchema,
  listParentsQuerySchema,
  updateParentSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateParentDto } from "./dto/create-parent.dto"
import { ListParentsQueryDto } from "./dto/list-parents-query.dto"
import { UpdateParentDto } from "./dto/update-parent.dto"
import { ParentsService } from "./parents.service"

@Controller("parents")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin")
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listParentsQuerySchema)) queryInput: unknown) {
    const query = queryInput as ListParentsQueryDto
    return this.parentsService.list(query)
  }

  @Get(":id")
  getById(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.parentsService.getById(query.tenantId, id)
  }

  @Get(":id/children")
  children(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.parentsService.getChildren(query.tenantId, id)
  }

  @Post()
  create(@Body(new ZodValidationPipe(createParentSchema)) payloadInput: unknown) {
    const payload = payloadInput as CreateParentDto
    return this.parentsService.create(payload)
  }

  @Patch(":id")
  update(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateParentSchema)) payloadInput: unknown
  ) {
    const query = queryInput as { tenantId: string }
    const payload = payloadInput as UpdateParentDto
    return this.parentsService.update(query.tenantId, id, payload)
  }

  @Post(":id/students/:studentId")
  linkStudent(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Param("studentId") studentId: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.parentsService.linkStudent(query.tenantId, id, studentId)
  }

  @Delete(":id/students/:studentId")
  unlinkStudent(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string,
    @Param("studentId") studentId: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.parentsService.unlinkStudent(query.tenantId, id, studentId)
  }

  @Delete(":id")
  delete(
    @Query(new ZodValidationPipe(userTenantQuerySchema)) queryInput: unknown,
    @Param("id") id: string
  ) {
    const query = queryInput as { tenantId: string }
    return this.parentsService.delete(query.tenantId, id)
  }
}
