import type { InferInsertModel } from "drizzle-orm"
import { users } from "../schema/users"

export type UserSeedInput = InferInsertModel<typeof users>

export const USER_SEED_DATA: UserSeedInput[] = []

export async function seedUsers(): Promise<UserSeedInput[]> {
  return USER_SEED_DATA
}
