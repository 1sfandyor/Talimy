import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import Redis from "ioredis"

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private readonly memory = new Map<string, { value: string; expiresAt: number | null }>()
  private client: Redis | null = null
  private clientInitAttempted = false

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined)
      this.client = null
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = this.getClient()
    if (client) {
      const raw = await client.get(key)
      return raw ? (JSON.parse(raw) as T) : null
    }

    const record = this.memory.get(key)
    if (!record) return null
    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.memory.delete(key)
      return null
    }
    return JSON.parse(record.value) as T
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value)
    const client = this.getClient()
    if (client) {
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, raw, "EX", ttlSeconds)
      } else {
        await client.set(key, raw)
      }
      return
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null
    this.memory.set(key, { value: raw, expiresAt })
  }

  async del(key: string): Promise<void> {
    const client = this.getClient()
    if (client) {
      await client.del(key)
      return
    }
    this.memory.delete(key)
  }

  async delByPrefix(prefix: string): Promise<number> {
    const client = this.getClient()
    if (client) {
      let cursor = "0"
      let deleted = 0
      do {
        const [next, keys] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100)
        cursor = next
        if (keys.length > 0) {
          deleted += await client.del(...keys)
        }
      } while (cursor !== "0")
      return deleted
    }

    let deleted = 0
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key)
        deleted += 1
      }
    }
    return deleted
  }

  async wrapJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key)
    if (cached !== null) return cached

    const value = await loader()
    await this.setJson(key, value, ttlSeconds)
    return value
  }

  private getClient(): Redis | null {
    if (this.client) return this.client
    if (this.clientInitAttempted) return null
    this.clientInitAttempted = true

    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not set. CacheService is using in-memory fallback.")
      return null
    }

    try {
      const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
      client.on("error", (error) => {
        this.logger.error(`Redis cache client error: ${error.message}`)
      })
      void client.connect().catch((error) => {
        this.logger.error(`Redis cache connect failed: ${error.message}`)
      })
      this.client = client
      return client
    } catch (error) {
      this.logger.error(
        `Failed to initialize Redis cache client: ${error instanceof Error ? error.message : "unknown error"}`
      )
      return null
    }
  }
}
