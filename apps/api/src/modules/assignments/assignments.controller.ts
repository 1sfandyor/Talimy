import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import {
  assignmentQuerySchema,
  createAssignmentSchema,
  gradeAssignmentSubmissionSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
  userTenantQuerySchema,
} from "@talimy/shared"

import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { CreateAssignmentDto, UpdateAssignmentDto } from "./dto/create-assignment.dto"
import { AssignmentQueryDto } from "./dto/assignment-query.dto"
import { GradeAssignmentSubmissionDto, SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import { AssignmentsService } from "./assignments.service"

@Controller("assignments")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles("platform_admin", "school_admin", "teacher", "student")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(assignmentQuerySchema))
  list(@Query() query: AssignmentQueryDto) {
    return this.assignmentsService.list(query)
  }

  @Get("stats")
  @Roles("platform_admin", "school_admin", "teacher")
  getOverviewStats(@Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }) {
    return this.assignmentsService.getOverviewStats(query.tenantId)
  }

  @Get(":id/stats")
  @Roles("platform_admin", "school_admin", "teacher")
  getAssignmentStats(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.assignmentsService.getAssignmentStats(query.tenantId, id)
  }

  @Get(":id/submissions")
  @Roles("platform_admin", "school_admin", "teacher")
  @UsePipes(new ZodValidationPipe(assignmentQuerySchema))
  listSubmissions(@Param("id") id: string, @Query() query: AssignmentQueryDto) {
    return this.assignmentsService.listSubmissions(query.tenantId, id, query)
  }

  @Get(":id")
  getById(@Param("id") id: string, @Query("tenantId") tenantId: string) {
    return this.assignmentsService.getById(tenantId, id)
  }

  @Post()
  @Roles("platform_admin", "school_admin", "teacher")
  create(@Body(new ZodValidationPipe(createAssignmentSchema)) payload: CreateAssignmentDto) {
    return this.assignmentsService.create(payload)
  }

  @Patch(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  update(
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Body(new ZodValidationPipe(updateAssignmentSchema)) payload: UpdateAssignmentDto
  ) {
    return this.assignmentsService.update(tenantId, id, payload)
  }

  @Delete(":id")
  @Roles("platform_admin", "school_admin", "teacher")
  delete(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(userTenantQuerySchema)) query: { tenantId: string }
  ) {
    return this.assignmentsService.delete(query.tenantId, id)
  }

  @Post(":id/submit")
  @Roles("platform_admin", "school_admin", "student")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        const isAllowedMime =
          file.mimetype.startsWith("image/") ||
          file.mimetype === "application/pdf" ||
          file.mimetype === "application/msword" ||
          file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if (!isAllowedMime) {
          callback(new BadRequestException("Unsupported assignment file type"), false)
          return
        }

        callback(null, true)
      },
    })
  )
  submit(
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Body(new ZodValidationPipe(submitAssignmentSchema)) payload: SubmitAssignmentDto,
    @UploadedFile() file?: { originalname?: string }
  ) {
    if (!payload.fileUrl && !file) {
      throw new BadRequestException("Either fileUrl or multipart file is required")
    }

    if (file && !payload.fileUrl) {
      throw new BadRequestException(
        "Direct assignment file upload is not configured yet. Upload the file via /upload and submit the returned fileUrl."
      )
    }

    return this.assignmentsService.submit(tenantId, id, payload)
  }

  @Patch(":id/submissions/:submissionId/grade")
  @Roles("platform_admin", "school_admin", "teacher")
  gradeSubmission(
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Query("tenantId") tenantId: string,
    @Body(new ZodValidationPipe(gradeAssignmentSubmissionSchema)) payload: GradeAssignmentSubmissionDto
  ) {
    return this.assignmentsService.gradeSubmission(tenantId, id, submissionId, payload)
  }
}
