import { BadRequestException, Injectable } from "@nestjs/common"

import { AssignmentSubmissionFilesService } from "./assignment-submission-files.service"
import { CreateAssignmentDto, UpdateAssignmentDto } from "./dto/create-assignment.dto"
import { AssignmentQueryDto } from "./dto/assignment-query.dto"
import { GradeAssignmentSubmissionDto, SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import { AssignmentsRepository } from "./assignments.repository"

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly repository: AssignmentsRepository,
    private readonly assignmentSubmissionFilesService: AssignmentSubmissionFilesService
  ) {}

  list(query: AssignmentQueryDto) {
    return this.repository.list(query)
  }

  getById(tenantId: string, assignmentId: string) {
    return this.repository.getById(tenantId, assignmentId)
  }

  create(payload: CreateAssignmentDto) {
    return this.repository.create(payload)
  }

  update(tenantId: string, assignmentId: string, payload: UpdateAssignmentDto) {
    return this.repository.update(tenantId, assignmentId, payload)
  }

  delete(tenantId: string, assignmentId: string) {
    return this.repository.delete(tenantId, assignmentId)
  }

  submit(tenantId: string, assignmentId: string, payload: SubmitAssignmentDto) {
    return this.repository.submit(tenantId, assignmentId, payload)
  }

  async submitWithUploadedFile(
    tenantId: string,
    assignmentId: string,
    payload: SubmitAssignmentDto,
    file: { buffer?: Buffer; originalname?: string }
  ) {
    if (!file.buffer) {
      throw new BadRequestException("Multipart assignment file buffer is missing")
    }

    const fileUrl = await this.assignmentSubmissionFilesService.saveSubmissionFile({
      tenantId,
      assignmentId,
      studentId: payload.studentId,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
      },
    })

    return this.repository.submit(tenantId, assignmentId, {
      ...payload,
      fileUrl,
    })
  }

  listSubmissions(tenantId: string, assignmentId: string, query: AssignmentQueryDto) {
    return this.repository.listSubmissions(tenantId, assignmentId, query)
  }

  gradeSubmission(tenantId: string, assignmentId: string, submissionId: string, payload: GradeAssignmentSubmissionDto) {
    return this.repository.gradeSubmission(tenantId, assignmentId, submissionId, payload)
  }

  getOverviewStats(tenantId: string) {
    return this.repository.getOverviewStats(tenantId)
  }

  getAssignmentStats(tenantId: string, assignmentId: string) {
    return this.repository.getAssignmentStats(tenantId, assignmentId)
  }
}
