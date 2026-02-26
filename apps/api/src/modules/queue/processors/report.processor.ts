import { Injectable } from "@nestjs/common"
import type { Job } from "bullmq"

import { AiService } from "@/modules/ai/ai.service"

import { parseReportJobPayload, type ReportJobPayload } from "../jobs/report.job"

@Injectable()
export class ReportProcessor {
  constructor(private readonly aiService: AiService) {}

  async process(job: Job<ReportJobPayload>) {
    const { actor, payload } = parseReportJobPayload(job.data)
    return this.aiService.generateReport(actor, payload)
  }
}
