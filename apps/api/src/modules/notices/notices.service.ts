import { ForbiddenException, Injectable } from "@nestjs/common"

import type { CurrentUser as CurrentUserPayload } from "@/common/decorators/current-user.decorator"

import { CreateNoticeDto, UpdateNoticeDto } from "./dto/create-notice.dto"
import { NoticeQueryDto } from "./dto/notice-query.dto"
import { NoticesRepository } from "./notices.repository"
import type { NoticeAudienceRole } from "./notices.types"

@Injectable()
export class NoticesService {
  constructor(private readonly repository: NoticesRepository) {}

  list(actor: CurrentUserPayload, query: NoticeQueryDto) {
    return this.repository.list({
      ...query,
      role: this.resolveScopedRole(actor, query.role),
    })
  }

  async getById(actor: CurrentUserPayload, tenantId: string, id: string) {
    const notice = await this.repository.getById(tenantId, id)
    const scopedRole = this.resolveScopedRole(actor)

    if (scopedRole && !["all", scopedRole].includes(notice.targetRole)) {
      throw new ForbiddenException("Notice is not available for authenticated user role")
    }

    return notice
  }

  create(actor: CurrentUserPayload, payload: CreateNoticeDto) {
    return this.repository.create(payload, actor.id)
  }

  update(tenantId: string, id: string, payload: UpdateNoticeDto) {
    return this.repository.update(tenantId, id, payload)
  }

  delete(tenantId: string, id: string) {
    return this.repository.delete(tenantId, id)
  }

  private resolveScopedRole(
    actor: CurrentUserPayload,
    requestedRole?: NoticeAudienceRole
  ): NoticeAudienceRole | undefined {
    const roles = new Set(actor.roles ?? [])
    if (roles.has("platform_admin") || roles.has("school_admin")) {
      return requestedRole
    }

    const fixedRole = roles.has("teacher")
      ? "teachers"
      : roles.has("student")
        ? "students"
        : roles.has("parent")
          ? "parents"
          : undefined

    if (!fixedRole) {
      return requestedRole
    }

    if (requestedRole && requestedRole !== fixedRole) {
      throw new ForbiddenException("Role filter does not match authenticated user role")
    }

    return fixedRole
  }
}
