import "./instrument"

import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor"
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor"
import { TransformInterceptor } from "./common/interceptors/transform.interceptor"

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix("api")
  app.enableCors({
    origin: ["https://talimy.space", "https://platform.talimy.space", /\.talimy\.space$/],
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor()
  )
  app.useGlobalFilters(new AllExceptionsFilter())

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port)
}

void bootstrap()
