import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { MailModule } from "../mail/mail.module";
import { getJwtExpiresIn, getJwtSecret } from "./auth.config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: getJwtExpiresIn(configService)
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginRateLimiterService]
})
export class AuthModule {}
