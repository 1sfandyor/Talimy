import type { InferInsertModel } from "drizzle-orm"

import { subjects } from "../schema/subjects"
import { SEED_IDS } from "./seed-ids"

export type SubjectSeedInput = InferInsertModel<typeof subjects>

export const SUBJECT_SEED_DATA: SubjectSeedInput[] = [
  {
    id: SEED_IDS.SUBJECT_MATH,
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    name: "Mathematics",
    code: "MATH-9",
    description: "Core mathematics subject for grade 9",
    isActive: true,
  },
]

export async function seedSubjects(): Promise<SubjectSeedInput[]> {
  return SUBJECT_SEED_DATA
}
