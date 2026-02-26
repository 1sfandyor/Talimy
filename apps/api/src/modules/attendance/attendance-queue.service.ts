import { Queue } from "bullmq"
import { Injectable, Logger } from "@nestjs/common"

export type AbsentAlertJobPayload = {
  tenantId: string
  classId: string
  date: string
  studentIds: string[]
}

@Injectable()
export class AttendanceQueueService {
  private readonly logger = new Logger(AttendanceQueueService.name)
  private queue: Queue<AbsentAlertJobPayload> | null = null

  async enqueueAbsentAlerts(payload: AbsentAlertJobPayload): Promise<void> {
    if (payload.studentIds.length === 0) return
    const queue = this.getQueue()
    if (!queue) return

    await queue.add("attendance.absent.notify", payload, {
      removeOnComplete: 100,
      removeOnFail: 100,
    })
  }

  private getQueue(): Queue<AbsentAlertJobPayload> | null {
    if (this.queue) return this.queue
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not set. Absent alert jobs are skipped.")
      return null
    }

    const parsed = new URL(redisUrl)
    this.queue = new Queue<AbsentAlertJobPayload>("attendance-alerts", {
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
