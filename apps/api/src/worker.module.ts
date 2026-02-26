import { Module } from "@nestjs/common"
import { SentryModule } from "@sentry/nestjs/setup"

import { CacheModule } from "./modules/cache/cache.module"
import { QueueModule } from "./modules/queue/queue.module"

@Module({
  // Queue workers instantiate NotificationsGateway -> AuthService -> AuthStoreRepository,
  // which depends on CacheService from the global CacheModule.
  imports: [SentryModule.forRoot(), CacheModule, QueueModule],
})
export class QueueWorkerModule {}
