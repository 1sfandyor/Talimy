import { ACADEMIC_YEAR_SEED_DATA, type AcademicYearSeedInput } from "./academic-years.seed"
import { CLASS_SEED_DATA, type ClassSeedInput } from "./classes.seed"
import type { TenantSeedInput } from "./tenants.seed"
import type { TeacherSeedInput } from "./teachers.seed"
import type { StudentSeedInput } from "./students.seed"
import { SUBJECT_SEED_DATA, type SubjectSeedInput } from "./subjects.seed"
import { TENANT_SEED_DATA } from "./tenants.seed"
import { TEACHER_SEED_DATA } from "./teachers.seed"
import { STUDENT_SEED_DATA } from "./students.seed"
import type { UserSeedInput } from "./users.seed"
import { USER_SEED_DATA } from "./users.seed"

export type DemoSeedBundle = {
  academicYears: AcademicYearSeedInput[]
  classes: ClassSeedInput[]
  subjects: SubjectSeedInput[]
  tenants: TenantSeedInput[]
  users: UserSeedInput[]
  teachers: TeacherSeedInput[]
  students: StudentSeedInput[]
}

export const DEMO_SEED_DATA: DemoSeedBundle = {
  academicYears: ACADEMIC_YEAR_SEED_DATA,
  classes: CLASS_SEED_DATA,
  subjects: SUBJECT_SEED_DATA,
  tenants: TENANT_SEED_DATA,
  users: USER_SEED_DATA,
  teachers: TEACHER_SEED_DATA,
  students: STUDENT_SEED_DATA,
}

export async function seedDemoData(): Promise<DemoSeedBundle> {
  return DEMO_SEED_DATA
}
