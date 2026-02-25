import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import { ZodError } from "zod"

type ErrorBody = {
  code: string
  message: string
  details?: unknown
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<{ method?: string; url?: string }>()
    const response = ctx.getResponse<{
      status: (code: number) => { json: (payload: unknown) => void }
    }>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const normalized = this.normalizeException(exception)
    const routeLabel = [request?.method, request?.url].filter(Boolean).join(" ")
    this.logger.error(
      routeLabel ? `${routeLabel} :: ${normalized.error.message}` : normalized.error.message,
      exception instanceof Error ? exception.stack : undefined
    )

    response.status(status).json({
      success: false,
      error: normalized.error,
    })
  }

  private normalizeException(exception: unknown): { error: ErrorBody } {
    if (exception instanceof HttpException) {
      return {
        error: this.normalizeHttpException(exception.getStatus(), exception.getResponse()),
      }
    }

    if (exception instanceof ZodError) {
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: exception.errors.map((item) => ({
            field: item.path.join("."),
            message: item.message,
          })),
        },
      }
    }

    if (this.isDatabaseLikeError(exception)) {
      return {
        error: {
          code: "DATABASE_ERROR",
          message: "Database operation failed",
        },
      }
    }

    const message = exception instanceof Error ? exception.message : "Internal server error"
    return {
      error: {
        code: "UNHANDLED_EXCEPTION",
        message,
      },
    }
  }

  private normalizeHttpException(status: number, exceptionResponse: unknown): ErrorBody {
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

  private isDatabaseLikeError(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") return false
    const payload = exception as { code?: unknown; constraint?: unknown; detail?: unknown }
    return (
      (typeof payload.code === "string" && /^[0-9A-Z]{5}$/.test(payload.code)) ||
      typeof payload.constraint === "string" ||
      typeof payload.detail === "string"
    )
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
