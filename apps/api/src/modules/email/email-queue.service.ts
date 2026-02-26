import { Queue } from "bullmq"
import { Injectable, Logger } from "@nestjs/common"
import { emailJobPayloadSchema } from "@talimy/shared"

import type { EmailJobPayload } from "./email.types"

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name)
  private queue: Queue<EmailJobPayload> | null = null

  async enqueue(payload: EmailJobPayload): Promise<void> {
    const parsed = emailJobPayloadSchema.parse(payload)
    const queue = this.getQueue()
    if (!queue) return

    await queue.add("email.send", parsed, {
      removeOnComplete: 100,
      removeOnFail: 100,
    })
  }

  private getQueue(): Queue<EmailJobPayload> | null {
    if (this.queue) return this.queue
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not set. Email jobs are skipped.")
      return null
    }

    const parsed = new URL(redisUrl)
    this.queue = new Queue<EmailJobPayload>("emails", {
      connection: {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === "rediss:" ? {} : undefined,
      },
    })
    return this.queue
  }
}
