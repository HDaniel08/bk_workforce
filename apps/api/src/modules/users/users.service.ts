import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { EmployeeSubRole, Prisma, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth-user.type";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { UserQueryDto } from "./dto/user-query.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async findAll(actor: AuthUser, query: UserQueryDto) {
    const where = this.buildUserWhere(actor, query);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { id: true, name: true, slug: true } } }
    });

    return users.map((user) => this.toUserResponse(user));
  }

  async findOne(actor: AuthUser, id: string) {
    const user = await this.getAccessibleUser(actor, id);
    return this.toUserResponse(user);
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const tenantId = this.resolveTenantId(actor, dto.tenantId);
    this.validateWorkerType(dto.employeeSubRole, dto.workerType);

    await this.ensureTenantExists(tenantId);

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.EMPLOYEE,
        employeeSubRole: dto.employeeSubRole,
        contractHours: dto.contractHours,
        workerType:
          dto.employeeSubRole === EmployeeSubRole.WORKER ? dto.workerType : null,
        mustChangePassword: true,
        isActive: true
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } }
    });

    await this.mailService.sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      email: user.email,
      temporaryPassword,
      loginUrl: this.mailService.getLoginUrl()
    });

    await this.createAuditLog(actor, user, "USER_CREATED", {
      email: user.email,
      employeeSubRole: user.employeeSubRole,
      workerType: user.workerType,
      contractHours: user.contractHours
    });

    return this.toUserResponse(user);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const existingUser = await this.getAccessibleUser(actor, id);

    if (existingUser.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("ADMIN_USER_UPDATE_DENIED");
    }

    if (dto.employeeSubRole) {
      this.validateWorkerType(dto.employeeSubRole, dto.workerType ?? undefined);
    }

    const wasActive = existingUser.isActive;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        employeeSubRole: dto.employeeSubRole,
        contractHours: dto.contractHours,
        workerType:
          dto.employeeSubRole === EmployeeSubRole.MANAGER
            ? null
            : dto.workerType ?? undefined,
        isActive: dto.isActive
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } }
    });

    const action =
      dto.isActive === false && wasActive
        ? "USER_DEACTIVATED"
        : dto.isActive === true && !wasActive
          ? "USER_ACTIVATED"
          : "USER_UPDATED";

    await this.createAuditLog(actor, user, action, { ...dto });

    return this.toUserResponse(user);
  }

  private buildUserWhere(actor: AuthUser, query: UserQueryDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (actor.role === UserRole.ADMIN) {
      if (query.tenantId) {
        where.tenantId = query.tenantId;
      }
    } else {
      where.tenantId = actor.tenantId;
      where.role = UserRole.EMPLOYEE;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    if (query.employeeSubRole) {
      where.employeeSubRole = query.employeeSubRole;
    }

    if (query.workerType) {
      where.workerType = query.workerType;
    }

    return where;
  }

  private async getAccessibleUser(actor: AuthUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } }
    });

    if (!user) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    if (actor.role !== UserRole.ADMIN && user.tenantId !== actor.tenantId) {
      throw new ForbiddenException("USER_ACCESS_DENIED");
    }

    return user;
  }

  private resolveTenantId(actor: AuthUser, requestedTenantId?: string) {
    if (actor.role === UserRole.ADMIN) {
      if (!requestedTenantId) {
        throw new BadRequestException("TENANT_ID_REQUIRED");
      }

      return requestedTenantId;
    }

    if (!actor.tenantId) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }

    return actor.tenantId;
  }

  private validateWorkerType(
    employeeSubRole: EmployeeSubRole,
    workerType?: CreateUserDto["workerType"]
  ) {
    if (employeeSubRole === EmployeeSubRole.WORKER && !workerType) {
      throw new BadRequestException("WORKER_TYPE_REQUIRED");
    }
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException("TENANT_NOT_FOUND");
    }
  }

  private createAuditLog(
    actor: AuthUser,
    user: { id: string; tenantId: string | null },
    action: string,
    metadata: Prisma.InputJsonValue
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorUserId: actor.id,
        action,
        entityType: "User",
        entityId: user.id,
        metadata
      }
    });
  }

  private generateTemporaryPassword() {
    return `Temp${Math.random().toString(36).slice(2, 10)}!1`;
  }

  private toUserResponse(user: {
    id: string;
    tenantId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: UserRole;
    employeeSubRole: EmployeeSubRole | null;
    workerType: string | null;
    contractHours: string | null;
    mustChangePassword: boolean;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    tenant: { id: string; name: string; slug: string } | null;
  }) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name ?? null,
      tenantSlug: user.tenant?.slug ?? null,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      employeeSubRole: user.employeeSubRole,
      workerType: user.workerType,
      contractHours: user.contractHours,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
