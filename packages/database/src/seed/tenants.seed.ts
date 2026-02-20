import type { InferInsertModel } from "drizzle-orm"
import { tenants } from "../schema/tenants"

export type TenantSeedInput = InferInsertModel<typeof tenants>

export const TENANT_SEED_DATA: TenantSeedInput[] = [
  {
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
