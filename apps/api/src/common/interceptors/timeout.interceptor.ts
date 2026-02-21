import {
  CallHandler,
  type ExecutionContext,
  Injectable,
  RequestTimeoutException,
  type NestInterceptor,
} from "@nestjs/common"
import { Observable, TimeoutError, catchError, throwError, timeout } from "rxjs"

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs = 15_000) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException("Request timeout"))
        }
        return throwError(() => error)
      })
    )
  }
}
