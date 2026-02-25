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
import { PermifyModule } from "./modules/authz/permify/permify.module"
import { AuthModule } from "./modules/auth/auth.module"
import { AssignmentsModule } from "./modules/assignments/assignments.module"
import { AttendanceModule } from "./modules/attendance/attendance.module"
import { ClassesModule } from "./modules/classes/classes.module"
import { CalendarModule } from "./modules/calendar/calendar.module"
import { ExamsModule } from "./modules/exams/exams.module"
import { FinanceModule } from "./modules/finance/finance.module"
import { GradesModule } from "./modules/grades/grades.module"
import { NoticesModule } from "./modules/notices/notices.module"
import { ParentsModule } from "./modules/parents/parents.module"
import { NotificationsModule } from "./modules/notifications/notifications.module"
import { ScheduleModule } from "./modules/schedule/schedule.module"
import { StudentsModule } from "./modules/students/students.module"
import { TeachersModule } from "./modules/teachers/teachers.module"
import { TenantsModule } from "./modules/tenants/tenants.module"
import { UsersModule } from "./modules/users/users.module"
import { UploadModule } from "./modules/upload/upload.module"

@Module({
  imports: [
    SentryModule.forRoot(),
    PermifyModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    TeachersModule,
    StudentsModule,
    ParentsModule,
    NoticesModule,
    NotificationsModule,
    ScheduleModule,
    ClassesModule,
    CalendarModule,
    AttendanceModule,
    AssignmentsModule,
    GradesModule,
    ExamsModule,
    FinanceModule,
    UploadModule,
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
