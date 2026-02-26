import { Logger } from "@nestjs/common"
import type { ConnectionOptions } from "bullmq"

export function resolveQueueConnection(logger: Logger): ConnectionOptions | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    logger.warn("REDIS_URL is not set. Queue workers are disabled.")
    return null
  }

  try {
    const parsed = new URL(redisUrl)
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    }
  } catch (error) {
    logger.error(
      `Failed to parse REDIS_URL for queue workers: ${error instanceof Error ? error.message : "unknown error"}`
    )
    return null
  }
}
