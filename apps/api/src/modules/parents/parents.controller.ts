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
  @UsePipes(new ZodValidationPipe(listParentsQuerySchema))
  list(@Query() query: ListParentsQueryDto) {
    return this.parentsService.list(query)
  }

  @Get(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  getById(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.parentsService.getById(tenantId, id)
  }

  @Get(":id/children")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  children(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.parentsService.getChildren(tenantId, id)
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createParentSchema))
  create(@Body() payload: CreateParentDto) {
    return this.parentsService.create(payload)
  }

  @Patch(":id")
  @UsePipes(new ZodValidationPipe(updateParentSchema))
  update(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() payload: UpdateParentDto
  ) {
    return this.parentsService.update(tenantId, id, payload)
  }

  @Post(":id/students/:studentId")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  linkStudent(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Param("studentId") studentId: string
  ) {
    return this.parentsService.linkStudent(tenantId, id, studentId)
  }

  @Delete(":id/students/:studentId")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  unlinkStudent(
    @Query("tenantId") tenantId: string,
    @Param("id") id: string,
    @Param("studentId") studentId: string
  ) {
    return this.parentsService.unlinkStudent(tenantId, id, studentId)
  }

  @Delete(":id")
  @UsePipes(new ZodValidationPipe(userTenantQuerySchema))
  delete(@Query("tenantId") tenantId: string, @Param("id") id: string) {
    return this.parentsService.delete(tenantId, id)
  }
}
