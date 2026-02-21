import { Controller, Get } from "@nestjs/common"

@Controller()
export class AppController {
  @Get("health")
  getHealth(): { success: boolean } {
    return { success: true }
  }

  @Get("debug-sentry")
  getError(): never {
    throw new Error("My first Sentry error!")
  }
}
