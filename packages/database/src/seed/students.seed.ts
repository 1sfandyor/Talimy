import type { InferInsertModel } from "drizzle-orm"
import { students } from "../schema/students"

export type StudentSeedInput = InferInsertModel<typeof students>

export const STUDENT_SEED_DATA: StudentSeedInput[] = []

export async function seedStudents(): Promise<StudentSeedInput[]> {
  return STUDENT_SEED_DATA
}
