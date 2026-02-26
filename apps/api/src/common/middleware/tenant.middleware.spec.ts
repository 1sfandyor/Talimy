/// <reference types="node" />
import { strict as assert } from "node:assert"
import { test } from "node:test"

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common"

import { TenantMiddleware } from "./tenant.middleware"
import type { TenantsService } from "../../modules/tenants/tenants.service"

type TestRequest = {
  headers: Record<string, string | string[] | undefined>
  tenantId?: string
  tenantSlug?: string
}

function createMiddleware(options?: {
  resolve?: (slug: string) => Promise<{ tenantId: string; tenantSlug: string }>
}) {
  const resolveCalls: string[] = []
  const tenantsService = {
    resolveTenantContextBySlug: async (slug: string) => {
      resolveCalls.push(slug)
      if (options?.resolve) {
        return options.resolve(slug)
      }

      return {
        tenantId: "11111111-1111-1111-1111-111111111111",
        tenantSlug: slug,
      }
    },
  } as unknown as TenantsService

  return {
    middleware: new TenantMiddleware(tenantsService),
    resolveCalls,
  }
}

async function runMiddleware(middleware: TenantMiddleware, req: TestRequest): Promise<boolean> {
  let nextCalled = false
  await middleware.use(req, {}, () => {
    nextCalled = true
  })
  return nextCalled
}

test("TenantMiddleware passes through x-tenant-id when no tenant slug context exists", async () => {
  const { middleware, resolveCalls } = createMiddleware()
  const req: TestRequest = {
    headers: {
      host: "api.talimy.space",
      "x-tenant-id": "22222222-2222-2222-2222-222222222222",
    },
  }

  const nextCalled = await runMiddleware(middleware, req)

  assert.equal(nextCalled, true)
  assert.equal(req.tenantId, "22222222-2222-2222-2222-222222222222")
  assert.equal(req.tenantSlug, undefined)
  assert.deepEqual(resolveCalls, [])
})

test("TenantMiddleware resolves x-tenant-slug into canonical tenant context", async () => {
  const { middleware, resolveCalls } = createMiddleware({
    resolve: async (slug) => ({
      tenantId: "33333333-3333-3333-3333-333333333333",
      tenantSlug: `canonical-${slug}`,
    }),
  })
  const req: TestRequest = {
    headers: {
      host: "api.talimy.space",
      "x-tenant-slug": "School-A",
    },
  }

  const nextCalled = await runMiddleware(middleware, req)

  assert.equal(nextCalled, true)
  assert.equal(req.tenantId, "33333333-3333-3333-3333-333333333333")
  assert.equal(req.tenantSlug, "canonical-school-a")
  assert.deepEqual(resolveCalls, ["school-a"])
})

test("TenantMiddleware resolves school subdomain from host header", async () => {
  const { middleware, resolveCalls } = createMiddleware()
  const req: TestRequest = {
    headers: {
      host: "school-7.talimy.space:3000",
    },
  }

  const nextCalled = await runMiddleware(middleware, req)

  assert.equal(nextCalled, true)
  assert.equal(req.tenantId, "11111111-1111-1111-1111-111111111111")
  assert.equal(req.tenantSlug, "school-7")
  assert.deepEqual(resolveCalls, ["school-7"])
})

test("TenantMiddleware rejects mismatched host and x-tenant-slug", async () => {
  const { middleware } = createMiddleware()
  const req: TestRequest = {
    headers: {
      host: "alpha.talimy.space",
      "x-tenant-slug": "beta",
    },
  }

  await assert.rejects(() => runMiddleware(middleware, req), BadRequestException)
})

test("TenantMiddleware rejects x-tenant-id mismatch against resolved tenant slug", async () => {
  const { middleware } = createMiddleware({
    resolve: async () => ({
      tenantId: "44444444-4444-4444-4444-444444444444",
      tenantSlug: "alpha",
    }),
  })
  const req: TestRequest = {
    headers: {
      host: "alpha.talimy.space",
      "x-tenant-id": "55555555-5555-5555-5555-555555555555",
    },
  }

  await assert.rejects(() => runMiddleware(middleware, req), ForbiddenException)
})

test("TenantMiddleware skips reserved subdomains without attempting resolution", async () => {
  const { middleware, resolveCalls } = createMiddleware()
  const req: TestRequest = {
    headers: {
      host: "platform.talimy.space",
    },
  }

  const nextCalled = await runMiddleware(middleware, req)

  assert.equal(nextCalled, true)
  assert.equal(req.tenantId, undefined)
  assert.equal(req.tenantSlug, undefined)
  assert.deepEqual(resolveCalls, [])
})

test("TenantMiddleware fails closed when tenant slug resolution fails", async () => {
  const { middleware } = createMiddleware({
    resolve: async () => {
      throw new NotFoundException("Tenant not found")
    },
  })
  const req: TestRequest = {
    headers: {
      "x-tenant-slug": "missing-school",
    },
  }

  await assert.rejects(() => runMiddleware(middleware, req), NotFoundException)
})
