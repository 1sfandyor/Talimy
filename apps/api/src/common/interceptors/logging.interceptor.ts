import {
  CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { Observable, tap } from "rxjs"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now()
    const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>()

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - now
        const method = req.method ?? "UNKNOWN"
        const url = req.url ?? ""
        // Keep logger lightweight for now; structured logging will be wired in phase 17.3.
        // eslint-disable-next-line no-console
        console.log(`[API] ${method} ${url} - ${elapsed}ms`)
      })
    )
  }
}
