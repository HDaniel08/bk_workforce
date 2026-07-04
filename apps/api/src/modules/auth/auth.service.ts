import {
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  EmployeeSubRole,
  User,
  UserRole,
  WorkerType
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { LoginDto } from "./dto/login.dto";

type UserWithTenant = User & {
  tenant: { name: string; slug: string } | null;
};

interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  employeeSubRole: EmployeeSubRole | null;
  workerType: WorkerType | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  loginEmployee(loginDto: LoginDto) {
    return this.login(loginDto, "EMPLOYEE");
  }

  loginAdmin(loginDto: LoginDto) {
    return this.login(loginDto, "ADMIN");
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new ForbiddenException("INACTIVE_USER");
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    await this.createAuditLog(user, "AUTH_CHANGE_PASSWORD");

    return { success: true };
  }

  private async login(loginDto: LoginDto, expectedRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
      include: {
        tenant: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user || user.role !== expectedRole) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (expectedRole === "EMPLOYEE" && !user.tenantId) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (expectedRole === "ADMIN" && user.tenantId) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new ForbiddenException("INACTIVE_USER");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    await this.createAuditLog(user, "AUTH_LOGIN");

    return {
      accessToken: await this.signAccessToken(user),
      user: this.toAuthResponseUser(user)
    };
  }

  private signAccessToken(user: UserWithTenant) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      employeeSubRole: user.employeeSubRole,
      workerType: user.workerType
    };

    return this.jwtService.signAsync(payload);
  }

  private toAuthResponseUser(user: UserWithTenant) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? null,
      tenantSlug: user.tenant?.slug ?? null,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      employeeSubRole: user.employeeSubRole,
      workerType: user.workerType,
      contractHours: user.contractHours,
      mustChangePassword: user.mustChangePassword
    };
  }

  private createAuditLog(user: Pick<User, "id" | "tenantId">, action: string) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entityType: "User",
        entityId: user.id,
        actorUserId: user.id,
        tenantId: user.tenantId
      }
    });
  }
}
