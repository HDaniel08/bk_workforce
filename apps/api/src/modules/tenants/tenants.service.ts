import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeSubRole, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth-user.type";
import { MailService } from "../mail/mail.service";
import type { CreateTenantDto } from "./dto/create-tenant.dto";
import type { UpdateTenantDto } from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } }
    });

    return tenants.map(({ _count, ...tenant }) => ({
      ...tenant,
      userCount: _count.users
    }));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException("TENANT_NOT_FOUND");
    }

    const [activeUsers, managerUsers, workerUsers] = await Promise.all([
      this.prisma.user.count({ where: { tenantId: id, isActive: true } }),
      this.prisma.user.count({
        where: { tenantId: id, employeeSubRole: EmployeeSubRole.MANAGER }
      }),
      this.prisma.user.count({
        where: { tenantId: id, employeeSubRole: EmployeeSubRole.WORKER }
      })
    ]);

    const { _count, ...tenantData } = tenant;
    return {
      ...tenantData,
      userCount: _count.users,
      activeUserCount: activeUsers,
      managerUserCount: managerUsers,
      workerUserCount: workerUsers
    };
  }

  async create(actor: AuthUser, dto: CreateTenantDto) {
    const adminEmail = dto.adminEmail.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });
    if (existingUser) {
      throw new BadRequestException("TENANT_ADMIN_EMAIL_ALREADY_EXISTS");
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const adminName = this.splitName(dto.adminName);

    const { tenant, tenantAdmin } = await this.prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          city: dto.city,
          address: dto.address
        }
      });

      const createdTenantAdmin = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          email: adminEmail,
          passwordHash,
          firstName: adminName.firstName,
          lastName: adminName.lastName,
          role: UserRole.EMPLOYEE,
          employeeSubRole: EmployeeSubRole.MANAGER,
          workerType: null,
          contractHours: "HOURS_8",
          mustChangePassword: true,
          isActive: true
        }
      });

      return {
        tenant: createdTenant,
        tenantAdmin: createdTenantAdmin
      };
    });

    await this.mailService.sendWelcomeEmail({
      to: tenantAdmin.email,
      firstName: tenantAdmin.firstName,
      email: tenantAdmin.email,
      temporaryPassword,
      loginUrl: this.mailService.getLoginUrl()
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "TENANT_CREATED",
        entityType: "Tenant",
        entityId: tenant.id,
        metadata: {
          name: dto.name,
          slug: dto.slug,
          city: dto.city,
          address: dto.address,
          adminEmail
        }
      }
    });

    return tenant;
  }

  async update(actor: AuthUser, id: string, dto: UpdateTenantDto) {
    await this.ensureTenantExists(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: actor.id,
        action: "TENANT_UPDATED",
        entityType: "Tenant",
        entityId: tenant.id,
        metadata: { ...dto }
      }
    });

    return tenant;
  }

  private async ensureTenantExists(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException("TENANT_NOT_FOUND");
    }
  }

  private generateTemporaryPassword() {
    return `Temp${Math.random().toString(36).slice(2, 10)}!1`;
  }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      throw new BadRequestException("TENANT_ADMIN_NAME_REQUIRED");
    }
    if (parts.length === 1) {
      return {
        firstName: parts[0] ?? name.trim(),
        lastName: "Admin"
      };
    }

    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1] ?? "Admin"
    };
  }
}
