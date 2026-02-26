import { describe, expect, it } from "bun:test"
import { z } from "zod"

import { createTrpcContext } from "./context"
import { authedProxyProcedure, publicProxyProcedure } from "./routers/router-helpers"
import { router } from "./trpc"

const testRouter = router({
  auth: router({
    login: publicProxyProcedure(
      "auth",
      "login",
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    ),
  }),
  ai: router({
    chat: authedProxyProcedure(
      "ai",
      "chat",
      z.object({
        tenantId: z.string().uuid(),
        messages: z.array(z.object({ role: z.enum(["user"]), content: z.string().min(1) })).min(1),
      })
    ),
  }),
})

describe("@talimy/trpc proxy router", () => {
  it("throws not implemented when handler is missing", async () => {
    const caller = testRouter.createCaller(createTrpcContext())
    await expect(caller.auth.login({ email: "a@b.com", password: "secret123" })).rejects.toThrow(
      /not implemented/i
    )
  })

  it("routes to provided handlers", async () => {
    const caller = testRouter.createCaller(
      createTrpcContext({
        handlers: {
          auth: {
            login: async (input) => ({ success: true, input }),
          },
        },
      })
    )

    const result = await caller.auth.login({ email: "a@b.com", password: "secret123" })
    expect((result as { success: boolean }).success).toBe(true)
  })

  it("requires auth session for authed procedures", async () => {
    const caller = testRouter.createCaller(createTrpcContext())
    await expect(
      caller.ai.chat({
        tenantId: crypto.randomUUID(),
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(/authentication required/i)
  })

  it("rejects tenant mismatches for non-platform users", async () => {
    const caller = testRouter.createCaller(
      createTrpcContext({
        user: {
          id: crypto.randomUUID(),
          tenantId: crypto.randomUUID(),
          roles: ["school_admin"],
        },
        handlers: {
          ai: {
            chat: async () => ({ ok: true }),
          },
        },
      })
    )

    await expect(
      caller.ai.chat({
        tenantId: crypto.randomUUID(),
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(/tenant mismatch/i)
  })
})
