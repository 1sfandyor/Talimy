import type { InferInsertModel } from "drizzle-orm"
import { teachers } from "../schema/teachers"
import { SEED_IDS } from "./seed-ids"

export type TeacherSeedInput = InferInsertModel<typeof teachers>

export const TEACHER_SEED_DATA: TeacherSeedInput[] = [
  {
    id: SEED_IDS.TEACHER_MAIN,
    userId: SEED_IDS.USER_TEACHER,
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    employeeId: "EMP-DEMO-001",
    gender: "male",
    joinDate: "2025-09-01",
    qualification: "Bachelor of Mathematics",
    specialization: "Mathematics",
    status: "active",
  },
]

export async function seedTeachers(): Promise<TeacherSeedInput[]> {
  return TEACHER_SEED_DATA
}
