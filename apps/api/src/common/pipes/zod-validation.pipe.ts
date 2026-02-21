import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common"

type ZodLikeSchema = {
  safeParse: (
    data: unknown
  ) =>
    | { success: true; data: unknown }
    | { success: false; error: { errors?: { message: string; path?: (string | number)[] }[] } }
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodLikeSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value)

    if (result.success) {
      return result.data
    }

    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: (result.error.errors ?? []).map((item) => ({
        field: item.path?.join("."),
        message: item.message,
      })),
    })
  }
}
