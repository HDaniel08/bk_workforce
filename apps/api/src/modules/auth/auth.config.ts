import { ConfigService } from "@nestjs/config";

export function getJwtSecret(configService: ConfigService) {
  const secret = configService.get<string>("JWT_SECRET")?.trim();

  if (!secret || secret === "change-me") {
    throw new Error("JWT_SECRET must be configured with a strong secret");
  }

  return secret;
}

export function getJwtExpiresIn(configService: ConfigService) {
  return configService.get<string>("JWT_EXPIRES_IN")?.trim() || "2h";
}
