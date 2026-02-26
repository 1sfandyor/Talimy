import { describe, expect, it, mock } from "bun:test"

import { NotificationProcessor } from "./processors/notification.processor"
import { ReportProcessor } from "./processors/report.processor"

describe("queue processors", () => {
  it("delegates notification jobs to NotificationsService", async () => {
    const send = mock(async () => ({ success: true }))
    const processor = new NotificationProcessor({ send } as never)

    await processor.process({
      data: {
        actor: { id: crypto.randomUUID(), tenantId: crypto.randomUUID(), roles: ["school_admin"] },
        payload: {
          tenantId: crypto.randomUUID(),
          recipientUserIds: [crypto.randomUUID()],
          title: "T",
          message: "M",
        },
      },
    } as never)

    expect(send).toHaveBeenCalledTimes(1)
  })

  it("delegates report jobs to AiService", async () => {
    const generateReport = mock(async () => ({ id: crypto.randomUUID() }))
    const processor = new ReportProcessor({ generateReport } as never)

    await processor.process({
      data: {
        actor: { id: crypto.randomUUID(), tenantId: crypto.randomUUID(), roles: ["teacher"] },
        payload: { tenantId: crypto.randomUUID(), type: "school_summary" },
      },
    } as never)

    expect(generateReport).toHaveBeenCalledTimes(1)
  })
})
