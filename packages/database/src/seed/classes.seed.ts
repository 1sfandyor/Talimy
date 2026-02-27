import type { InferInsertModel } from "drizzle-orm"

import { classes } from "../schema/classes"
import { SEED_IDS } from "./seed-ids"

export type ClassSeedInput = InferInsertModel<typeof classes>

export const CLASS_SEED_DATA: ClassSeedInput[] = [
  {
    id: SEED_IDS.CLASS_9A,
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    name: "9-A",
    grade: "9",
    section: "A",
    capacity: 30,
    academicYearId: SEED_IDS.ACADEMIC_YEAR_2025_2026,
  },
]

export async function seedClasses(): Promise<ClassSeedInput[]> {
  return CLASS_SEED_DATA
}
