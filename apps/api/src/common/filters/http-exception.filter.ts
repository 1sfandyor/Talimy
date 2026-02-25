import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common"

type ErrorPayload = {
  code: string
  message: string
  details?: unknown
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<{
      status: (code: number) => { json: (payload: unknown) => void }
    }>()

    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()
    const error = this.normalizeHttpException(status, exceptionResponse)

    response.status(status).json({
      success: false,
      error,
    })
  }

  private normalizeHttpException(status: number, exceptionResponse: unknown): ErrorPayload {
    if (typeof exceptionResponse === "string") {
      return {
        code: this.defaultCodeForStatus(status),
        message: exceptionResponse,
      }
    }

    if (exceptionResponse && typeof exceptionResponse === "object") {
      const payload = exceptionResponse as Record<string, unknown>
      const messageValue = payload.message

      if (typeof payload.code === "string" && typeof messageValue === "string") {
        return {
          code: payload.code,
          message: messageValue,
          ...(payload.details !== undefined ? { details: payload.details } : {}),
        }
      }

      if (Array.isArray(messageValue)) {
        return {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: messageValue.map((message) => ({ message })),
        }
      }

      if (typeof messageValue === "string") {
        return {
          code: this.defaultCodeForStatus(status),
          message: messageValue,
        }
      }
    }

    return {
      code: this.defaultCodeForStatus(status),
      message: "Request failed",
    }
  }

  private defaultCodeForStatus(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) return "BAD_REQUEST"
    if (status === HttpStatus.UNAUTHORIZED) return "UNAUTHORIZED"
    if (status === HttpStatus.FORBIDDEN) return "FORBIDDEN"
    if (status === HttpStatus.NOT_FOUND) return "NOT_FOUND"
    if (status === HttpStatus.CONFLICT) return "CONFLICT"
    if (status >= 500) return "INTERNAL_SERVER_ERROR"
    return "HTTP_EXCEPTION"
  }
}
