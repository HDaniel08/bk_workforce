import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { getJwtSecret } from "../auth.config";
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
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService)
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        role: true,
        employeeSubRole: true,
        workerType: true,
        isActive: true,
        isDeleted: true
      }
    });

    if (
      !user ||
      !user.isActive ||
      user.isDeleted ||
      user.tenantId !== payload.tenantId ||
      user.role !== payload.role ||
      user.employeeSubRole !== payload.employeeSubRole ||
      user.workerType !== payload.workerType
    ) {
      throw new UnauthorizedException("INVALID_TOKEN");
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      employeeSubRole: user.employeeSubRole,
      workerType: user.workerType
    };
  }
}
