/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { ForbiddenException } from "@nestjs/common"

import { NoticesService } from "./notices.service"
import type { NoticesRepository } from "./notices.repository"
import type { NoticeQueryDto } from "./dto/notice-query.dto"

const tenantId = "11111111-1111-1111-1111-111111111111"

test("NoticesService.list scopes teacher to teachers role", () => {
  let captured: NoticeQueryDto | undefined
  const repo = {
    list: (q: NoticeQueryDto) => {
      captured = q
      return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
    },
  } as unknown as NoticesRepository

  const service = new NoticesService(repo)
  const actor = { id: "u1", tenantId, roles: ["teacher"] }
  const query = { tenantId, page: 1, limit: 10, order: "desc" } as unknown as NoticeQueryDto
  service.list(actor as never, query)

  assert.equal(captured?.role, "teachers")
})

test("NoticesService.list rejects mismatched fixed role filter", () => {
  const repo = {
    list: () => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
  } as unknown as NoticesRepository
  const service = new NoticesService(repo)
  const actor = { id: "u2", tenantId, roles: ["student"] }
  const query = {
    tenantId,
    page: 1,
    limit: 10,
    order: "desc",
    role: "teachers",
  } as unknown as NoticeQueryDto

  assert.throws(() => service.list(actor as never, query), ForbiddenException)
})
