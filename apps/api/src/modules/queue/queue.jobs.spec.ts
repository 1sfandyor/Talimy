import { describe, expect, it } from "bun:test"

import { parseNotificationJobPayload } from "./jobs/notification.job"
import { parseReportJobPayload } from "./jobs/report.job"

describe("queue job payload parsers", () => {
  it("parses notification job payload", () => {
    const parsed = parseNotificationJobPayload({
      actor: { id: crypto.randomUUID(), roles: ["school_admin"], tenantId: crypto.randomUUID() },
      payload: {
        tenantId: crypto.randomUUID(),
        recipientUserIds: [crypto.randomUUID()],
        title: "Hello",
        message: "World",
      },
    })

    expect(parsed.payload.title).toBe("Hello")
  })

  it("parses report job payload", () => {
    const parsed = parseReportJobPayload({
      actor: { id: crypto.randomUUID(), roles: ["teacher"], tenantId: crypto.randomUUID() },
      payload: {
        tenantId: crypto.randomUUID(),
        type: "school_summary",
        parameters: { classId: crypto.randomUUID() },
      },
    })

    expect(parsed.payload.type).toBe("school_summary")
  })
})
