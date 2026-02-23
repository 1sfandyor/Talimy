import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator"

export class CreatePaymentDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  studentId!: string

  @IsNumber()
  @Min(0)
  amount!: number

  @IsString()
  @MaxLength(50)
  method!: string

  @IsOptional()
  @IsIn(["pending", "paid", "overdue", "failed"])
  status?: "pending" | "paid" | "overdue" | "failed"

  @IsDateString()
  date!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptNumber?: string
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string

  @IsOptional()
  @IsIn(["pending", "paid", "overdue", "failed"])
  status?: "pending" | "paid" | "overdue" | "failed"

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptNumber?: string | null
}
