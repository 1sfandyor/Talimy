import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup"

import { AppController } from "./app.controller"
import { AuthGuard } from "./common/guards/auth.guard"
import { GenderGuard } from "./common/guards/gender.guard"
import { RolesGuard } from "./common/guards/roles.guard"
import { TenantGuard } from "./common/guards/tenant.guard"
import { LoggerMiddleware } from "./common/middleware/logger.middleware"
import { TenantMiddleware } from "./common/middleware/tenant.middleware"
import { AuthModule } from "./modules/auth/auth.module"
import { ParentsModule } from "./modules/parents/parents.module"
import { StudentsModule } from "./modules/students/students.module"
import { TeachersModule } from "./modules/teachers/teachers.module"
import { TenantsModule } from "./modules/tenants/tenants.module"
import { UsersModule } from "./modules/users/users.module"

@Module({
  imports: [
    SentryModule.forRoot(),
    AuthModule,
    UsersModule,
    TenantsModule,
    TeachersModule,
    StudentsModule,
    ParentsModule,
  ],
  controllers: [AppController],
  providers: [
    AuthGuard,
    RolesGuard,
    TenantGuard,
    GenderGuard,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware, TenantMiddleware).forRoutes("*")
  }
}
