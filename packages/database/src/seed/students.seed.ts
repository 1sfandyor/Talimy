import type { InferInsertModel } from "drizzle-orm"
import { students } from "../schema/students"
import { SEED_IDS } from "./seed-ids"

export type StudentSeedInput = InferInsertModel<typeof students>

export const STUDENT_SEED_DATA: StudentSeedInput[] = [
  {
    id: SEED_IDS.STUDENT_MAIN,
    userId: SEED_IDS.USER_STUDENT,
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    studentId: "STU-DEMO-001",
    gender: "male",
    classId: SEED_IDS.CLASS_9A,
    enrollmentDate: "2025-09-01",
    status: "active",
  },
]

export async function seedStudents(): Promise<StudentSeedInput[]> {
  return STUDENT_SEED_DATA
}
