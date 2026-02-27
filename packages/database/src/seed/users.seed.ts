import type { InferInsertModel } from "drizzle-orm"
import { users } from "../schema/users"
import { SEED_IDS } from "./seed-ids"

export type UserSeedInput = InferInsertModel<typeof users>

const DEMO_PASSWORD_HASH = "$2b$12$Qf6L9mVPxQnJm1A1Qn0mQe9lS5hH2jE8k6R3QkN7Y1wE2PzA0a6vS"

export const USER_SEED_DATA: UserSeedInput[] = [
  {
    id: SEED_IDS.USER_PLATFORM_ADMIN,
    email: "platform-admin@talimy.space",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Platform",
    lastName: "Admin",
    role: "platform_admin",
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    isActive: true,
  },
  {
    id: SEED_IDS.USER_SCHOOL_ADMIN,
    email: "school-admin.main@demo-school.talimy.space",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "School",
    lastName: "Admin",
    role: "school_admin",
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    isActive: true,
  },
  {
    id: SEED_IDS.USER_TEACHER,
    email: "teacher.main@demo-school.talimy.space",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Demo",
    lastName: "Teacher",
    role: "teacher",
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    isActive: true,
  },
  {
    id: SEED_IDS.USER_STUDENT,
    email: "student.main@demo-school.talimy.space",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Demo",
    lastName: "Student",
    role: "student",
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    isActive: true,
  },
  {
    id: SEED_IDS.USER_PARENT,
    email: "parent.main@demo-school.talimy.space",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Demo",
    lastName: "Parent",
    role: "parent",
    tenantId: SEED_IDS.TENANT_DEMO_SCHOOL,
    isActive: true,
  },
]

export async function seedUsers(): Promise<UserSeedInput[]> {
  return USER_SEED_DATA
}
