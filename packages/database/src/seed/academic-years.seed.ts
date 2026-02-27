import type { InferInsertModel } from "drizzle-orm"

import { academicYears } from "../schema/academic-years"
import { SEED_IDS } from "./seed-ids"

export type AcademicYearSeedInput = InferInsertModel<typeof academicYears>

export const ACADEMIC_YEAR_SEED_DATA: AcademicYearSeedInput[] = [
  {
    id: SEED_IDS.ACADEMIC_YEAR_2025_2026,
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    name: "2025-2026",
    startDate: new Date("2025-09-01T00:00:00.000Z"),
    endDate: new Date("2026-06-01T00:00:00.000Z"),
    isCurrent: true,
  },
]

export async function seedAcademicYears(): Promise<AcademicYearSeedInput[]> {
  return ACADEMIC_YEAR_SEED_DATA
}
