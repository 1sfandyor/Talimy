import "./instrument"

import { Logger } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"

import { QueueWorkerModule } from "./worker.module"

const WORKER_BOOTSTRAP_LOGGER = new Logger("QueueWorkerBootstrap")

async function bootstrap(): Promise<void> {
  process.env.QUEUE_WORKERS_ENABLED ??= "true"
  process.env.APP_RUNTIME ??= "queue-worker"

  const app = await NestFactory.createApplicationContext(QueueWorkerModule)
  WORKER_BOOTSTRAP_LOGGER.log(
    `Queue worker runtime started (QUEUE_WORKERS_ENABLED=${process.env.QUEUE_WORKERS_ENABLED})`
  )

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    WORKER_BOOTSTRAP_LOGGER.log(`Shutdown signal received: ${signal}`)
    try {
      await app.close()
      WORKER_BOOTSTRAP_LOGGER.log("Queue worker runtime stopped")
      process.exit(0)
    } catch (error) {
      WORKER_BOOTSTRAP_LOGGER.error(
        `Queue worker shutdown failed: ${error instanceof Error ? error.message : "unknown error"}`
      )
      process.exit(1)
    }
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal)
    })
  }
}

void bootstrap()
