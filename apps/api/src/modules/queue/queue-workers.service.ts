import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { Worker, type ConnectionOptions } from "bullmq"

import { EmailProcessor } from "./processors/email.processor"
import { NotificationProcessor } from "./processors/notification.processor"
import { ReportProcessor } from "./processors/report.processor"
import { SmsProcessor } from "./processors/sms.processor"
import { resolveQueueConnection } from "./queue.redis"

@Injectable()
export class QueueWorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkersService.name)
  private readonly workers: Worker[] = []

  constructor(
    private readonly emailProcessor: EmailProcessor,
    private readonly smsProcessor: SmsProcessor,
    private readonly notificationProcessor: NotificationProcessor,
    private readonly reportProcessor: ReportProcessor
  ) {}

  onModuleInit(): void {
    const connection = resolveQueueConnection(this.logger)
    if (!connection) return

    this.workers.push(
      this.createWorker("emails", connection, (job: unknown) =>
        this.emailProcessor.process(job as never)
      ),
      this.createWorker("sms", connection, (job: unknown) =>
        this.smsProcessor.process(job as never)
      ),
      this.createWorker("notifications", connection, (job: unknown) =>
        this.notificationProcessor.process(job as never)
      ),
      this.createWorker("reports", connection, (job: unknown) =>
        this.reportProcessor.process(job as never)
      )
    )
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()))
    this.workers.length = 0
  }

  private createWorker(
    queueName: string,
    connection: ConnectionOptions,
    processor: (job: unknown) => Promise<unknown>
  ): Worker {
    const worker = new Worker(queueName, processor, { connection })

    worker.on("failed", (job, error) => {
      this.logger.error(
        `Queue worker failed [${queueName}] job=${job?.name ?? "unknown"}: ${error.message}`,
        error.stack
      )
    })

    worker.on("error", (error) => {
      this.logger.error(`Queue worker error [${queueName}]: ${error.message}`, error.stack)
    })

    this.logger.log(`Queue worker started: ${queueName}`)
    return worker
  }
}
