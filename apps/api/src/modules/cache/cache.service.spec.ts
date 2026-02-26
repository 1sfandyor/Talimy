import { afterAll, beforeEach, describe, expect, it } from "bun:test"

import { CacheService } from "./cache.service"

const originalRedisUrl = process.env.REDIS_URL

describe("CacheService", () => {
  let cache: CacheService

  beforeEach(() => {
    delete process.env.REDIS_URL
    cache = new CacheService()
  })

  it("stores and retrieves json in memory fallback", async () => {
    await cache.setJson("test:key", { ok: true }, 30)
    const value = await cache.getJson<{ ok: boolean }>("test:key")
    expect(value).toEqual({ ok: true })
  })

  it("deletes by prefix in memory fallback", async () => {
    await cache.setJson("audit:a", { a: 1 }, 30)
    await cache.setJson("audit:b", { b: 1 }, 30)
    await cache.setJson("other:c", { c: 1 }, 30)

    const deleted = await cache.delByPrefix("audit:")
    expect(deleted).toBe(2)
    expect(await cache.getJson("audit:a")).toBeNull()
    expect(await cache.getJson("other:c")).toEqual({ c: 1 })
  })
})

afterAll(async () => {
  if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl
  else delete process.env.REDIS_URL
})
