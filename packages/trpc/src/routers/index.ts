import { router } from "../trpc"
import { aiRouter } from "./ai.router"
import { assignmentRouter } from "./assignment.router"
import { attendanceRouter } from "./attendance.router"
import { authRouter } from "./auth.router"
import { examRouter } from "./exam.router"
import { financeRouter } from "./finance.router"
import { gradeRouter } from "./grade.router"
import { notificationRouter } from "./notification.router"
import { parentRouter } from "./parent.router"
import { scheduleRouter } from "./schedule.router"
import { studentRouter } from "./student.router"
import { teacherRouter } from "./teacher.router"
import { tenantRouter } from "./tenant.router"
import { userRouter } from "./user.router"

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  user: userRouter,
  teacher: teacherRouter,
  student: studentRouter,
  parent: parentRouter,
  attendance: attendanceRouter,
  grade: gradeRouter,
  exam: examRouter,
  assignment: assignmentRouter,
  finance: financeRouter,
  notification: notificationRouter,
  schedule: scheduleRouter,
  ai: aiRouter,
})

export type AppRouter = typeof appRouter
