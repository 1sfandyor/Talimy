import { z } from "zod"

const feeFrequencySchema = z.enum(["monthly", "termly", "yearly"])
const paymentStatusSchema = z.enum(["pending", "paid", "overdue", "failed"])
const invoiceStatusSchema = z.enum(["draft", "issued", "paid", "overdue", "cancelled"])

const amountSchema = z.coerce.number().finite().min(0)

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().min(1),
  unitPrice: amountSchema,
  amount: amountSchema.optional(),
})

export const createFeeStructureSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  amount: amountSchema,
  frequency: feeFrequencySchema.default("monthly"),
  classId: z.string().uuid().optional(),
  description: z.string().trim().max(500).optional(),
})

export const updateFeeStructureSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  amount: amountSchema.optional(),
  frequency: feeFrequencySchema.optional(),
  classId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
})

export const createPaymentPlanSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
  totalAmount: amountSchema,
  paidAmount: amountSchema.optional(),
  dueDate: z.string().date(),
})

export const updatePaymentPlanSchema = z.object({
  feeStructureId: z.string().uuid().optional(),
  totalAmount: amountSchema.optional(),
  paidAmount: amountSchema.optional(),
  dueDate: z.string().date().optional(),
})

export const createPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  amount: amountSchema,
  method: z.string().trim().min(1).max(50),
  status: paymentStatusSchema.default("paid"),
  date: z.string().date(),
  receiptNumber: z.string().trim().min(1).max(100).optional(),
})

export const updatePaymentSchema = z.object({
  amount: amountSchema.optional(),
  method: z.string().trim().min(1).max(50).optional(),
  status: paymentStatusSchema.optional(),
  date: z.string().date().optional(),
  receiptNumber: z.string().trim().min(1).max(100).optional().nullable(),
})

export const createInvoiceSchema = z
  .object({
    tenantId: z.string().uuid(),
    studentId: z.string().uuid(),
    items: z.array(invoiceItemSchema).min(1),
    status: invoiceStatusSchema.default("issued"),
    issuedDate: z.string().date(),
    dueDate: z.string().date(),
  })
  .refine((value) => new Date(value.dueDate).getTime() >= new Date(value.issuedDate).getTime(), {
    message: "dueDate must be greater than or equal to issuedDate",
    path: ["dueDate"],
  })

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>
export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>
export type UpdatePaymentPlanInput = z.infer<typeof updatePaymentPlanSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
