import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AvailabilityDayType,
  AvailabilityPeriodType,
  EmployeeSubRole,
  Prisma,
  UserRole,
  VacationRequestStatus
} from "@prisma/client";
import type { AuthUser } from "../auth/types/auth-user.type";
import {
  getMonthStart,
  getWeekStart,
  parseDateOnly,
  toDateOnly
} from "../availability/helpers/date.helpers";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateVacationRequestDto } from "./dto/create-vacation-request.dto";
import type { ReviewVacationRequestDto } from "./dto/review-vacation-request.dto";
import type { VacationRequestQueryDto } from "./dto/vacation-request-query.dto";

@Injectable()
export class VacationRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(actor: AuthUser, query: VacationRequestQueryDto) {
    return this.findRequests({
      ...query,
      requesterUserId: actor.id
    });
  }

  async createMe(actor: AuthUser, dto: CreateVacationRequestDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }

    const startDate = parseDateOnly(dto.startDate);
    const endDate = parseDateOnly(dto.endDate);
    this.validateDateRange(startDate, endDate);
    this.validateNotPast(startDate);

    const overlapping = await this.prisma.vacationRequest.findFirst({
      where: {
        requesterUserId: actor.id,
        status: { in: [VacationRequestStatus.PENDING, VacationRequestStatus.APPROVED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    if (overlapping) {
      throw new BadRequestException("VACATION_REQUEST_OVERLAP");
    }

    const request = await this.prisma.vacationRequest.create({
      data: {
        tenantId: actor.tenantId,
        requesterUserId: actor.id,
        startDate,
        endDate,
        reason: dto.reason,
        status: VacationRequestStatus.PENDING
      },
      include: this.requestInclude()
    });

    await this.createAudit(actor, "VACATION_REQUEST_CREATED", request.id, {
      requesterUserId: actor.id,
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(endDate),
      status: request.status
    });

    return this.toRequestResponse(request);
  }

  getAll(actor: AuthUser, query: VacationRequestQueryDto) {
    const tenantId =
      actor.role === UserRole.ADMIN ? query.tenantId : actor.tenantId ?? undefined;
    return this.findRequests({
      ...query,
      tenantId,
      requesterUserId: query.userId
    });
  }

  async approve(actor: AuthUser, id: string, dto: ReviewVacationRequestDto) {
    const request = await this.getTenantPendingRequest(actor, id);
    const updated = await this.prisma.vacationRequest.update({
      where: { id },
      data: {
        status: VacationRequestStatus.APPROVED,
        reviewedByUserId: actor.id,
        reviewedAt: new Date(),
        reviewerNote: dto.reviewerNote
      },
      include: this.requestInclude()
    });

    const affectedDaysCount = await this.fillAvailabilityVacationDays(updated);

    await this.createAudit(actor, "VACATION_REQUEST_APPROVED", id, {
      requesterUserId: request.requesterUserId,
      startDate: toDateOnly(request.startDate),
      endDate: toDateOnly(request.endDate),
      status: VacationRequestStatus.APPROVED,
      reviewedByUserId: actor.id,
      affectedDaysCount
    });

    return this.toRequestResponse(updated);
  }

  async reject(actor: AuthUser, id: string, dto: ReviewVacationRequestDto) {
    const request = await this.getTenantPendingRequest(actor, id);
    const updated = await this.prisma.vacationRequest.update({
      where: { id },
      data: {
        status: VacationRequestStatus.REJECTED,
        reviewedByUserId: actor.id,
        reviewedAt: new Date(),
        reviewerNote: dto.reviewerNote
      },
      include: this.requestInclude()
    });

    await this.createAudit(actor, "VACATION_REQUEST_REJECTED", id, {
      requesterUserId: request.requesterUserId,
      startDate: toDateOnly(request.startDate),
      endDate: toDateOnly(request.endDate),
      status: VacationRequestStatus.REJECTED,
      reviewedByUserId: actor.id
    });

    return this.toRequestResponse(updated);
  }

  async cancel(actor: AuthUser, id: string) {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id },
      include: this.requestInclude()
    });

    if (!request) {
      throw new NotFoundException("VACATION_REQUEST_NOT_FOUND");
    }
    if (request.requesterUserId !== actor.id) {
      throw new ForbiddenException("VACATION_REQUEST_ACCESS_DENIED");
    }
    if (request.status !== VacationRequestStatus.PENDING) {
      throw new BadRequestException("ONLY_PENDING_CAN_BE_CANCELLED");
    }

    const updated = await this.prisma.vacationRequest.update({
      where: { id },
      data: { status: VacationRequestStatus.CANCELLED },
      include: this.requestInclude()
    });

    await this.createAudit(actor, "VACATION_REQUEST_CANCELLED", id, {
      requesterUserId: actor.id,
      startDate: toDateOnly(request.startDate),
      endDate: toDateOnly(request.endDate),
      status: VacationRequestStatus.CANCELLED
    });

    return this.toRequestResponse(updated);
  }

  private async findRequests(
    query: VacationRequestQueryDto & { requesterUserId?: string }
  ) {
    const where: Prisma.VacationRequestWhereInput = {
      tenantId: query.tenantId,
      requesterUserId: query.requesterUserId,
      status: query.status
    };

    if (query.from || query.to) {
      where.startDate = query.to ? { lte: parseDateOnly(query.to) } : undefined;
      where.endDate = query.from ? { gte: parseDateOnly(query.from) } : undefined;
    }

    const requests = await this.prisma.vacationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: this.requestInclude()
    });

    return requests.map((request) => this.toRequestResponse(request));
  }

  private async getTenantPendingRequest(actor: AuthUser, id: string) {
    if (!actor.tenantId) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }

    const request = await this.prisma.vacationRequest.findUnique({
      where: { id },
      include: this.requestInclude()
    });

    if (!request) {
      throw new NotFoundException("VACATION_REQUEST_NOT_FOUND");
    }
    if (request.tenantId !== actor.tenantId) {
      throw new ForbiddenException("VACATION_REQUEST_TENANT_DENIED");
    }
    if (request.status !== VacationRequestStatus.PENDING) {
      throw new BadRequestException("ONLY_PENDING_CAN_BE_REVIEWED");
    }

    return request;
  }

  private async fillAvailabilityVacationDays(
    request: Awaited<ReturnType<VacationRequestsService["getTenantPendingRequest"]>>
  ) {
    const requester = request.requester;
    const dates = this.expandDates(request.startDate, request.endDate);
    const vacationDates = dates.filter((date) => !this.isWeekend(date));
    const periodType =
      requester.employeeSubRole === EmployeeSubRole.MANAGER
        ? AvailabilityPeriodType.MONTHLY
        : AvailabilityPeriodType.WEEKLY;

    for (const date of dates) {
      const weekStartDate =
        periodType === AvailabilityPeriodType.WEEKLY ? getWeekStart(date) : null;
      const monthStartDate =
        periodType === AvailabilityPeriodType.MONTHLY ? getMonthStart(date) : null;

      let availability = await this.prisma.availabilityWeek.findFirst({
        where: {
          tenantId: request.tenantId,
          userId: request.requesterUserId,
          periodType,
          weekStartDate,
          monthStartDate
        }
      });

      availability ??= await this.prisma.availabilityWeek.create({
        data: {
          tenantId: request.tenantId,
          userId: request.requesterUserId,
          periodType,
          weekStartDate,
          monthStartDate,
          status: "DRAFT"
        }
      });

      await this.prisma.availabilityDay.deleteMany({
        where: {
          availabilityWeekId: availability.id,
          date
        }
      });
      await this.prisma.availabilityDay.create({
        data: {
          availabilityWeekId: availability.id,
          date,
          type: this.isWeekend(date)
            ? AvailabilityDayType.OFF
            : AvailabilityDayType.VACATION,
          workPreference: null,
          startTime: null,
          endTime: null,
          note: this.isWeekend(date)
            ? "Szabadsag idoszakaba eso hetvegi pihenonap"
            : "Elfogadott szabadsagkerelem alapjan"
        }
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorUserId: request.reviewedByUserId,
        action: "AVAILABILITY_VACATION_AUTO_FILLED",
        entityType: "VacationRequest",
        entityId: request.id,
        metadata: {
          requesterUserId: request.requesterUserId,
          startDate: toDateOnly(request.startDate),
          endDate: toDateOnly(request.endDate),
          affectedDaysCount: vacationDates.length,
          weekendRestDaysCount: dates.length - vacationDates.length
        }
      }
    });

    return vacationDates.length;
  }

  private validateDateRange(startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new BadRequestException("END_DATE_BEFORE_START_DATE");
    }
  }

  private validateNotPast(startDate: Date) {
    const today = parseDateOnly(toDateOnly(new Date()));
    if (startDate < today) {
      throw new BadRequestException("PAST_DATE_NOT_ALLOWED");
    }
  }

  private expandDates(startDate: Date, endDate: Date) {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private isWeekend(date: Date) {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  private createAudit(
    actor: AuthUser,
    action: string,
    entityId: string,
    metadata: Prisma.InputJsonValue
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorUserId: actor.id,
        action,
        entityType: "VacationRequest",
        entityId,
        metadata
      }
    });
  }

  private requestInclude() {
    return {
      tenant: { select: { id: true, name: true, slug: true } },
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          workerType: true,
          employeeSubRole: true,
          contractHours: true
        }
      },
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    };
  }

  private toRequestResponse(request: {
    id: string;
    tenantId: string;
    requesterUserId: string;
    reviewedByUserId: string | null;
    startDate: Date;
    endDate: Date;
    status: VacationRequestStatus;
    reason: string | null;
    reviewerNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    tenant: { id: string; name: string; slug: string };
    requester: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      workerType: string | null;
      employeeSubRole: string | null;
      contractHours: string | null;
    };
    reviewedBy: { id: string; firstName: string; lastName: string } | null;
  }) {
    return {
      ...request,
      startDate: toDateOnly(request.startDate),
      endDate: toDateOnly(request.endDate),
      tenantName: request.tenant.name,
      requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
      reviewerName: request.reviewedBy
        ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}`
        : null
    };
  }
}
