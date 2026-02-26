import {
  assignmentQuerySchema,
  createAssignmentSchema,
  gradeAssignmentSubmissionSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const assignmentRouter = router({
  list: authedProxyQuery("assignment", "list", assignmentQuerySchema),
  getById: authedProxyQuery(
    "assignment",
    "getById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  create: authedProxyProcedure("assignment", "create", createAssignmentSchema),
  update: authedProxyProcedure(
    "assignment",
    "update",
    z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      payload: updateAssignmentSchema,
    })
  ),
  delete: authedProxyProcedure(
    "assignment",
    "delete",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  submit: authedProxyProcedure(
    "assignment",
    "submit",
    z.object({ assignmentId: z.string().uuid(), payload: submitAssignmentSchema })
  ),
  grade: authedProxyProcedure(
    "assignment",
    "grade",
    z.object({
      assignmentId: z.string().uuid(),
      submissionId: z.string().uuid(),
      payload: gradeAssignmentSubmissionSchema,
    })
  ),
  stats: authedProxyQuery(
    "assignment",
    "stats",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid().optional() })
  ),
})
