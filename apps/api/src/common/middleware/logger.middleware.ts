import { Injectable, type NestMiddleware } from "@nestjs/common"

type NextFunction = () => void
type RequestLike = {
  method: string
  originalUrl?: string
}
type ResponseLike = object

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: RequestLike, _res: ResponseLike, next: NextFunction): void {
    // eslint-disable-next-line no-console
    console.log(`[REQ] ${req.method} ${req.originalUrl}`)
    next()
  }
}
