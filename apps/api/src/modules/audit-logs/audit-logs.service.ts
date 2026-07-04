import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuditLogQueryDto } from "./dto/audit-log-query.dto";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: query.tenantId,
      actorUserId: query.actorUserId,
      action: query.action,
      entityType: query.entityType
    };

    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        tenant: { select: { name: true } },
        actor: { select: { firstName: true, lastName: true } }
      }
    });

    return logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      tenantName: log.tenant?.name ?? null,
      actorUserId: log.actorUserId,
      actorName: log.actor
        ? `${log.actor.firstName} ${log.actor.lastName}`
        : null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt
    }));
  }
}
