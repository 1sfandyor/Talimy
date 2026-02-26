import { loginSchema, logoutSchema, refreshTokenSchema, registerSchema } from "@talimy/shared"

import { router } from "../trpc"
import { publicProxyProcedure } from "./router-helpers"

export const authRouter = router({
  login: publicProxyProcedure("auth", "login", loginSchema),
  register: publicProxyProcedure("auth", "register", registerSchema),
  refresh: publicProxyProcedure("auth", "refresh", refreshTokenSchema),
  logout: publicProxyProcedure("auth", "logout", logoutSchema),
})
