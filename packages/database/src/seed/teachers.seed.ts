import type { InferInsertModel } from "drizzle-orm"
import { teachers } from "../schema/teachers"

export type TeacherSeedInput = InferInsertModel<typeof teachers>

export const TEACHER_SEED_DATA: TeacherSeedInput[] = []

export async function seedTeachers(): Promise<TeacherSeedInput[]> {
  return TEACHER_SEED_DATA
}
