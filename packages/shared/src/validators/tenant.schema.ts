import { z } from "zod"

const genderPolicySchema = z.enum(["boys_only", "girls_only", "mixed"])
const tenantStatusSchema = z.enum(["active", "inactive", "suspended"])
const billingPlanSchema = z.enum(["free", "basic", "pro", "enterprise"])

export const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  genderPolicy: genderPolicySchema,
  billingPlan: billingPlanSchema.optional(),
  studentLimit: z.number().int().min(1).max(100000).optional(),
  adminLimit: z.number().int().min(1).max(10000).optional(),
  monthlyPrice: z.number().min(0).optional(),
  currency: z.string().min(3).optional(),
})

export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  genderPolicy: genderPolicySchema.optional(),
  status: tenantStatusSchema.optional(),
  billingPlan: billingPlanSchema.optional(),
  studentLimit: z.number().int().min(1).max(100000).optional(),
  adminLimit: z.number().int().min(1).max(10000).optional(),
  monthlyPrice: z.number().min(0).optional(),
  currency: z.string().min(3).optional(),
})

export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: tenantStatusSchema.optional(),
  billingPlan: billingPlanSchema.optional(),
})

export const updateTenantBillingSchema = z.object({
  billingPlan: billingPlanSchema.optional(),
  studentLimit: z.number().int().min(1).max(100000).optional(),
  adminLimit: z.number().int().min(1).max(10000).optional(),
  monthlyPrice: z.number().min(0).optional(),
  currency: z.string().min(3).optional(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type ListTenantsQueryInput = z.infer<typeof listTenantsQuerySchema>
export type UpdateTenantBillingInput = z.infer<typeof updateTenantBillingSchema>
