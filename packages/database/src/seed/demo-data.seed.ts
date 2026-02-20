import type { TenantSeedInput } from "./tenants.seed"
import type { TeacherSeedInput } from "./teachers.seed"
import type { StudentSeedInput } from "./students.seed"
import type { UserSeedInput } from "./users.seed"

export type DemoSeedBundle = {
  tenants: TenantSeedInput[]
  users: UserSeedInput[]
  teachers: TeacherSeedInput[]
  students: StudentSeedInput[]
}

export const DEMO_SEED_DATA: DemoSeedBundle = {
  tenants: [],
  users: [],
  teachers: [],
  students: [],
}

export async function seedDemoData(): Promise<DemoSeedBundle> {
  return DEMO_SEED_DATA
}
