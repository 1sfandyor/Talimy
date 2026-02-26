import { db, students } from "@talimy/database"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { Injectable } from "@nestjs/common"
import type { Job } from "bullmq"

import { NotificationsService } from "@/modules/notifications/notifications.service"
import type { AbsentAlertJobPayload } from "@/modules/attendance/attendance-queue.service"

@Injectable()
export class AttendanceAlertsProcessor {
  constructor(private readonly notificationsService: NotificationsService) {}

  async process(job: Job<AbsentAlertJobPayload>) {
    const payload = job.data
    const studentIds = Array.from(new Set(payload.studentIds))
    if (studentIds.length === 0) {
      return { success: true as const, recipients: 0, skipped: true as const }
    }

    const rows = await db
      .select({ userId: students.userId })
      .from(students)
      .where(
        and(
          eq(students.tenantId, payload.tenantId),
          inArray(students.id, studentIds),
          isNull(students.deletedAt)
        )
      )

    const recipientUserIds = Array.from(new Set(rows.map((row) => row.userId)))
    if (recipientUserIds.length === 0) {
      return { success: true as const, recipients: 0, skipped: true as const }
    }

    const result = await this.notificationsService.send(
      {
        id: "attendance-alerts-worker",
        tenantId: payload.tenantId,
        roles: ["teacher"],
      },
      {
        tenantId: payload.tenantId,
        recipientUserIds,
        title: "Attendance alert",
        message: `Absent on ${payload.date}`,
        type: "warning",
        channels: ["in_app"],
      }
    )

    return {
      success: true as const,
      recipients: recipientUserIds.length,
      notifications: result.data.created,
    }
  }
}
