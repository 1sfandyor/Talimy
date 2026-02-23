import { Type } from "class-transformer"
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator"

class CreateInvoiceItemDto {
  @IsString()
  @MaxLength(200)
  description!: string

  @IsInt()
  @Min(1)
  quantity!: number

  @IsNumber()
  @Min(0)
  unitPrice!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number
}

export class CreateInvoiceDto {
  @IsUUID()
  tenantId!: string

  @IsUUID()
  studentId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[]

  @IsOptional()
  @IsIn(["draft", "issued", "paid", "overdue", "cancelled"])
  status?: "draft" | "issued" | "paid" | "overdue" | "cancelled"

  @IsDateString()
  issuedDate!: string

  @IsDateString()
  dueDate!: string
}
