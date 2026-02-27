import type { InferInsertModel } from "drizzle-orm"
import { tenants } from "../schema/tenants"
import { SEED_IDS } from "./seed-ids"

export type TenantSeedInput = InferInsertModel<typeof tenants>

export const TENANT_SEED_DATA: TenantSeedInput[] = [
  {
    id: SEED_IDS.TENANT_DEMO_SCHOOL,
    name: "Demo School",
    slug: "demo-school",
    domain: "demo-school.talimy.space",
    status: "active",
    genderPolicy: "mixed",
    plan: "pro",
  },
]

export async function seedTenants(): Promise<TenantSeedInput[]> {
  return TENANT_SEED_DATA
}
