import {
  createFeeStructureSchema,
  createInvoiceSchema,
  createPaymentPlanSchema,
  createPaymentSchema,
  updateFeeStructureSchema,
  updatePaymentPlanSchema,
  updatePaymentSchema,
  userTenantQuerySchema,
} from "@talimy/shared"
import { z } from "zod"

import { router } from "../trpc"
import { authedProxyProcedure, authedProxyQuery } from "./router-helpers"

export const financeRouter = router({
  overview: authedProxyQuery("finance", "overview", userTenantQuerySchema),
  paymentsSummary: authedProxyQuery("finance", "paymentsSummary", userTenantQuerySchema),
  listFeeStructures: authedProxyQuery("finance", "listFeeStructures", userTenantQuerySchema),
  getFeeStructureById: authedProxyQuery(
    "finance",
    "getFeeStructureById",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  createFeeStructure: authedProxyProcedure(
    "finance",
    "createFeeStructure",
    createFeeStructureSchema
  ),
  updateFeeStructure: authedProxyProcedure(
    "finance",
    "updateFeeStructure",
    z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      payload: updateFeeStructureSchema,
    })
  ),
  deleteFeeStructure: authedProxyProcedure(
    "finance",
    "deleteFeeStructure",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  listPaymentPlans: authedProxyQuery("finance", "listPaymentPlans", userTenantQuerySchema),
  createPaymentPlan: authedProxyProcedure("finance", "createPaymentPlan", createPaymentPlanSchema),
  updatePaymentPlan: authedProxyProcedure(
    "finance",
    "updatePaymentPlan",
    z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      payload: updatePaymentPlanSchema,
    })
  ),
  deletePaymentPlan: authedProxyProcedure(
    "finance",
    "deletePaymentPlan",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() })
  ),
  listPayments: authedProxyQuery("finance", "listPayments", userTenantQuerySchema),
  createPayment: authedProxyProcedure("finance", "createPayment", createPaymentSchema),
  updatePayment: authedProxyProcedure(
    "finance",
    "updatePayment",
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), payload: updatePaymentSchema })
  ),
  listInvoices: authedProxyQuery("finance", "listInvoices", userTenantQuerySchema),
  createInvoice: authedProxyProcedure("finance", "createInvoice", createInvoiceSchema),
})
