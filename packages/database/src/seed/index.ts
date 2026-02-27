import { seedAcademicYears } from "./academic-years.seed"
import { seedClasses } from "./classes.seed"
import { seedDemoData } from "./demo-data.seed"
import { seedStudents } from "./students.seed"
import { seedSubjects } from "./subjects.seed"
import { seedTeachers } from "./teachers.seed"
import { seedTenants } from "./tenants.seed"
import { seedUsers } from "./users.seed"

export async function runSeed(): Promise<void> {
  await seedTenants()
  await seedAcademicYears()
  await seedClasses()
  await seedSubjects()
  await seedUsers()
  await seedTeachers()
  await seedStudents()
  await seedDemoData()
}

if (import.meta.main) {
  await runSeed()
}
