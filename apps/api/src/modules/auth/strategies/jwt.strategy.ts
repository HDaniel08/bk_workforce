import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthUser } from "../types/auth-user.type";

interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: AuthUser["role"];
  employeeSubRole: AuthUser["employeeSubRole"];
  workerType: AuthUser["workerType"];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "change-me")
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      employeeSubRole: payload.employeeSubRole,
      workerType: payload.workerType
    };
  }
}
