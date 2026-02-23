import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from "class-validator"

export class CreatePaymentPlanDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  studentId!: string

  @IsUUID()
  feeStructureId!: string

  @IsNumber()
  @Min(0)
  totalAmount!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number

  @IsDateString()
  dueDate!: string
}

export class UpdatePaymentPlanDto {
  @IsOptional()
  @IsUUID()
  feeStructureId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number

  @IsOptional()
  @IsDateString()
  dueDate?: string
}
