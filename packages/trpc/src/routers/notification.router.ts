import {
  markNotificationReadSchema,
  notificationScopeQuerySchema,
  notificationsQuerySchema,
  sendNotificationSchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const notificationRouter = router({
  list: authedProxyQuery("notification", "list", notificationsQuerySchema),
  unreadCount: authedProxyQuery("notification", "unreadCount", notificationScopeQuerySchema),
  send: authedProxyProcedure("notification", "send", sendNotificationSchema),
  markRead: authedProxyProcedure(
    "notification",
    "markRead",
    z.object({ id: z.string().uuid(), payload: markNotificationReadSchema })
  ),
})
