import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common"
import {
  aiChatSchema,
  aiInsightsQuerySchema,
  aiReportGenerateSchema,
  uuidStringSchema,
} from "@talimy/shared"

import {
  CurrentUser,
  type CurrentUser as CurrentUserPayload,
} from "@/common/decorators/current-user.decorator"
import { Roles } from "@/common/decorators/roles.decorator"
import { AuthGuard } from "@/common/guards/auth.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { TenantGuard } from "@/common/guards/tenant.guard"
import { ZodParamFieldPipe } from "@/common/pipes/zod-param-field.pipe"
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe"

import { AiService } from "./ai.service"
import { AiChatDto } from "./dto/chat.dto"
import { AiInsightsQueryDto, AiReportGenerateDto } from "./dto/report.dto"

@Controller("ai")
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  chat(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(aiChatSchema)) bodyInput: unknown
  ) {
    const body = bodyInput as AiChatDto
    return this.aiService.chat(this.requireUser(user), body)
  }

  @Post("chat/stream")
  @Roles("platform_admin", "school_admin", "teacher", "student", "parent")
  async chatStream(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(aiChatSchema)) bodyInput: unknown,
    @Res() response: unknown
  ) {
    const body = bodyInput as AiChatDto
    await this.aiService.streamChat(this.requireUser(user), body, response)
  }

  @Get("insights/:studentId")
  @Roles("platform_admin", "school_admin", "teacher")
  getStudentInsights(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param("studentId", new ZodParamFieldPipe(uuidStringSchema)) studentId: string,
    @Query(new ZodValidationPipe(aiInsightsQuerySchema)) queryInput: unknown
  ) {
    const query = queryInput as AiInsightsQueryDto
    return this.aiService.getStudentInsights(this.requireUser(user), studentId, query)
  }

  @Post("report/generate")
  @Roles("platform_admin", "school_admin")
  generateReport(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body(new ZodValidationPipe(aiReportGenerateSchema)) bodyInput: unknown
  ) {
    const body = bodyInput as AiReportGenerateDto
    return this.aiService.generateReport(this.requireUser(user), body)
  }

  private requireUser(user: CurrentUserPayload | null): CurrentUserPayload {
    if (!user) {
      throw new UnauthorizedException("Authenticated user is required")
    }
    return user
  }
}
