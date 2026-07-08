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
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import { LoginRateLimiterService } from "./login-rate-limiter.service";

type UserWithTenant = User & {
  tenant: { name: string; slug: string } | null;
};

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

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
    private readonly jwtService: JwtService,
    private readonly loginRateLimiter: LoginRateLimiterService,
    private readonly mailService: MailService
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      return { success: true };
    }

    const token = this.generatePasswordResetToken();
    const tokenHash = this.hashPasswordResetToken(token);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS)
        }
      })
    ]);

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl: this.mailService.getPasswordResetUrl(token)
    });

    await this.createAuditLog(user, "AUTH_PASSWORD_RESET_REQUESTED");

    return { success: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashPasswordResetToken(resetPasswordDto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date() ||
      !resetToken.user.isActive
    ) {
      throw new UnauthorizedException("INVALID_PASSWORD_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          mustChangePassword: false
        }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      })
    ]);

    await this.createAuditLog(resetToken.user, "AUTH_PASSWORD_RESET_COMPLETED");

    return { success: true };
  }

  private async login(loginDto: LoginDto, expectedRole: UserRole) {
    const email = loginDto.email.toLowerCase();
    const rateLimitKey = `${expectedRole}:${email}`;

    this.loginRateLimiter.assertCanAttempt(rateLimitKey);

    const user = await this.prisma.user.findUnique({
      where: { email },
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
      this.rejectInvalidCredentials(rateLimitKey);
    }

    if (expectedRole === "EMPLOYEE" && !user.tenantId) {
      this.rejectInvalidCredentials(rateLimitKey);
    }

    if (expectedRole === "ADMIN" && user.tenantId) {
      this.rejectInvalidCredentials(rateLimitKey);
    }

    if (!user.isActive) {
      throw new ForbiddenException("INACTIVE_USER");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      this.rejectInvalidCredentials(rateLimitKey);
    }

    this.loginRateLimiter.reset(rateLimitKey);

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

  private rejectInvalidCredentials(rateLimitKey: string): never {
    this.loginRateLimiter.recordFailure(rateLimitKey);
    throw new UnauthorizedException("INVALID_CREDENTIALS");
  }

  private generatePasswordResetToken() {
    return randomBytes(32).toString("base64url");
  }

  private hashPasswordResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
