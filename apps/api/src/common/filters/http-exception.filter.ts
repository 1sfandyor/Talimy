import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<{
      status: (code: number) => { json: (payload: unknown) => void }
    }>()

    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()
    const message = typeof exceptionResponse === "string" ? exceptionResponse : "Request failed"

    response.status(status).json({
      success: false,
      error: {
        code: "HTTP_EXCEPTION",
        message,
      },
    })
  }
}
