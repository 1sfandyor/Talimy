import {
  CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { map, type Observable } from "rxjs"

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { success: true; data: T }> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<{ success: true; data: T }> {
    return next
      .handle()
      .pipe(
        map((data) =>
          this.isSuccessEnvelope(data)
            ? (data as { success: true; data: T })
            : { success: true as const, data }
        )
      )
  }

  private isSuccessEnvelope(value: unknown): value is { success: true; data: unknown } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false
    }

    const record = value as Record<string, unknown>
    return record.success === true && ("data" in record || "meta" in record)
  }
}
