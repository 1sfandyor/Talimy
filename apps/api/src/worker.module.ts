import { Module } from "@nestjs/common"
import { SentryModule } from "@sentry/nestjs/setup"

import { QueueModule } from "./modules/queue/queue.module"

@Module({
  imports: [SentryModule.forRoot(), QueueModule],
})
export class QueueWorkerModule {}
