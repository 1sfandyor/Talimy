import { attendanceQuerySchema, markAttendanceSchema } from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const attendanceRouter = router({
  mark: authedProxyProcedure("attendance", "mark", markAttendanceSchema),
  getByClass: authedProxyQuery(
    "attendance",
    "getByClass",
    z
      .object({ tenantId: z.string().uuid(), classId: z.string().uuid() })
      .merge(attendanceQuerySchema.partial())
  ),
  getByStudent: authedProxyQuery(
    "attendance",
    "getByStudent",
    z
      .object({ tenantId: z.string().uuid(), studentId: z.string().uuid() })
      .merge(attendanceQuerySchema.partial())
  ),
  report: authedProxyQuery("attendance", "report", attendanceQuerySchema),
})
