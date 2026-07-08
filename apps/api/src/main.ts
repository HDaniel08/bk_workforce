import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appUrls = (configService.get<string>("APP_URL") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = configService.get<string>("NODE_ENV") === "production";

  if (isProduction && appUrls.length === 0) {
    throw new Error("APP_URL must be configured in production");
  }

  app.enableCors({
    origin:
      appUrls.length > 0
        ? (origin, callback) => {
            if (!origin || appUrls.includes(origin)) {
              callback(null, true);
              return;
            }

            callback(new Error("CORS_ORIGIN_DENIED"));
          }
        : true,
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port =
    configService.get<number>("PORT") ??
    configService.get<number>("API_PORT") ??
    3000;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
