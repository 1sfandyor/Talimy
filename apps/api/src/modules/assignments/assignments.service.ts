import { Injectable } from "@nestjs/common"

import { CreateAssignmentDto, UpdateAssignmentDto } from "./dto/create-assignment.dto"
import { AssignmentQueryDto } from "./dto/assignment-query.dto"
import { GradeAssignmentSubmissionDto, SubmitAssignmentDto } from "./dto/submit-assignment.dto"
import { AssignmentsRepository } from "./assignments.repository"

@Injectable()
export class AssignmentsService {
  constructor(private readonly repository: AssignmentsRepository) {}

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
