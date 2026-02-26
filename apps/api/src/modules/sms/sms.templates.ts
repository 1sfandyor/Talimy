import { Injectable } from "@nestjs/common"
import { smsTemplateRenderSchema } from "@talimy/shared"

type SmsTemplateName = "attendance-alert" | "grade-alert" | "notification"

type SmsTemplateOutput = {
  body: string
}

@Injectable()
export class SmsTemplatesService {
  render(
    template: SmsTemplateName,
    variables: Record<string, string | number | boolean | null>
  ): SmsTemplateOutput {
    const parsed = smsTemplateRenderSchema.parse({
      tenantId: "00000000-0000-0000-0000-000000000000",
      to: ["+10000000000"],
      template,
      variables,
    })

    if (parsed.template === "attendance-alert") {
      return {
        body: this.compact(
          `Attendance alert: ${String(variables.studentName ?? "Student")} was marked ${String(
            variables.status ?? "absent"
          )} on ${String(variables.date ?? "today")}.`
        ),
      }
    }

    if (parsed.template === "grade-alert") {
      return {
        body: this.compact(
          `Grade update: ${String(variables.studentName ?? "Student")} scored ${String(
            variables.score ?? "-"
          )}${variables.subject ? ` in ${String(variables.subject)}` : ""}.`
        ),
      }
    }

    return {
      body: this.compact(
        `${String(variables.title ?? "Notification")}: ${String(variables.message ?? "")}`
      ),
    }
  }

  private compact(value: string): string {
    return value.replace(/\s+/g, " ").trim().slice(0, 1600)
  }
}
