import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, ScheduleWeekStatus, UserRole } from "@prisma/client";
import type { AuthUser } from "../auth/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { parseDateOnly, toDateOnly, getWeekEnd, getWeekStart } from "../availability/helpers/date.helpers";
import { AssignShiftDto } from "./dto/assign-shift.dto";
import { CreateScheduleWeekDto } from "./dto/create-schedule-week.dto";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { validateShiftTimeWindow } from "./helpers/shift-time.helpers";

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeks(
    actor: AuthUser,
    query: { weekStartDate?: string; tenantId?: string }
  ) {
    const tenantId = this.resolveReadTenantId(actor, query.tenantId, false);
    const where: Prisma.ScheduleWeekWhereInput = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (query.weekStartDate) {
      where.weekStartDate = getWeekStart(parseDateOnly(query.weekStartDate));
    }

    return this.prisma.scheduleWeek.findMany({
      where,
      orderBy: { weekStartDate: "desc" },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { shifts: true } }
      }
    });
  }

  async createWeek(actor: AuthUser, dto: CreateScheduleWeekDto) {
    const tenantId = this.requireManagerTenant(actor);
    const weekStartDate = getWeekStart(parseDateOnly(dto.weekStartDate));

    const existingWeek = await this.prisma.scheduleWeek.findUnique({
      where: { tenantId_weekStartDate: { tenantId, weekStartDate } },
      include: this.weekInclude()
    });

    if (existingWeek) {
      return this.toWeekResponse(existingWeek);
    }

    const week = await this.prisma.scheduleWeek.create({
      data: {
        tenantId,
        weekStartDate,
        createdByUserId: actor.id
      },
      include: this.weekInclude()
    });

    await this.createAudit(actor, "SCHEDULE_WEEK_CREATED", "ScheduleWeek", week.id, {
      weekStartDate: toDateOnly(weekStartDate)
    });

    return this.toWeekResponse(week);
  }

  async getWeek(actor: AuthUser, id: string) {
    const week = await this.getAccessibleWeek(actor, id);
    return this.toWeekResponse(week);
  }

  async createShift(actor: AuthUser, weekId: string, dto: CreateShiftDto) {
    const week = await this.getManagerDraftWeek(actor, weekId);
    const date = parseDateOnly(dto.date);
    this.validateDateInWeek(date, week.weekStartDate);
    validateShiftTimeWindow(date, dto.startTime, dto.endTime);

    const shift = await this.prisma.shift.create({
      data: {
        scheduleWeekId: week.id,
        tenantId: week.tenantId,
        date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        label: dto.label,
        note: dto.note
      },
      include: this.shiftInclude()
    });

    await this.createAudit(actor, "SHIFT_CREATED", "Shift", shift.id, {
      weekStartDate: toDateOnly(week.weekStartDate),
      shiftId: shift.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime
    });

    return shift;
  }

  async updateShift(actor: AuthUser, shiftId: string, dto: UpdateShiftDto) {
    const shift = await this.getManagerDraftShift(actor, shiftId);
    const date = dto.date ? parseDateOnly(dto.date) : shift.date;
    const startTime = dto.startTime ?? shift.startTime;
    const endTime = dto.endTime ?? shift.endTime;
    this.validateDateInWeek(date, shift.scheduleWeek.weekStartDate);
    validateShiftTimeWindow(date, startTime, endTime);

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        date,
        startTime,
        endTime,
        label: dto.label,
        note: dto.note
      },
      include: this.shiftInclude()
    });

    await this.createAudit(actor, "SHIFT_UPDATED", "Shift", shiftId, {
      weekStartDate: toDateOnly(shift.scheduleWeek.weekStartDate),
      shiftId,
      date: toDateOnly(date),
      startTime,
      endTime
    });

    return updated;
  }

  async deleteShift(actor: AuthUser, shiftId: string) {
    const shift = await this.getManagerDraftShift(actor, shiftId);
    await this.prisma.shift.delete({ where: { id: shiftId } });
    await this.createAudit(actor, "SHIFT_DELETED", "Shift", shiftId, {
      weekStartDate: toDateOnly(shift.scheduleWeek.weekStartDate),
      shiftId,
      date: toDateOnly(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime
    });
    return { success: true };
  }

  async assignShift(actor: AuthUser, shiftId: string, dto: AssignShiftDto) {
    const shift = await this.getManagerDraftShift(actor, shiftId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });

    if (!user || user.tenantId !== shift.tenantId || user.role === UserRole.ADMIN || !user.isActive) {
      throw new BadRequestException("USER_NOT_ASSIGNABLE");
    }

    const assignment = await this.prisma.shiftAssignment.create({
      data: {
        shiftId,
        userId: user.id,
        tenantId: shift.tenantId
      },
      include: { user: this.assignmentUserSelect() }
    });

    await this.createAudit(actor, "SHIFT_ASSIGNED", "ShiftAssignment", assignment.id, {
      weekStartDate: toDateOnly(shift.scheduleWeek.weekStartDate),
      shiftId,
      userId: user.id,
      date: toDateOnly(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime
    });

    return assignment;
  }

  async unassignShift(actor: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { shift: { include: { scheduleWeek: true } } }
    });

    if (!assignment) {
      throw new NotFoundException("ASSIGNMENT_NOT_FOUND");
    }
    this.ensureManagerTenant(actor, assignment.tenantId);
    this.ensureDraft(assignment.shift.scheduleWeek);

    await this.prisma.shiftAssignment.delete({ where: { id: assignmentId } });
    await this.createAudit(actor, "SHIFT_UNASSIGNED", "ShiftAssignment", assignmentId, {
      weekStartDate: toDateOnly(assignment.shift.scheduleWeek.weekStartDate),
      shiftId: assignment.shiftId,
      userId: assignment.userId,
      date: toDateOnly(assignment.shift.date),
      startTime: assignment.shift.startTime,
      endTime: assignment.shift.endTime
    });

    return { success: true };
  }

  async publishWeek(actor: AuthUser, id: string) {
    const week = await this.getManagerDraftWeek(actor, id);
    const updated = await this.prisma.scheduleWeek.update({
      where: { id },
      data: { status: ScheduleWeekStatus.PUBLISHED, publishedAt: new Date() },
      include: this.weekInclude()
    });
    await this.createAudit(actor, "SCHEDULE_PUBLISHED", "ScheduleWeek", id, {
      weekStartDate: toDateOnly(week.weekStartDate)
    });
    return this.toWeekResponse(updated);
  }

  async lockWeek(actor: AuthUser, id: string) {
    const week = await this.getAccessibleWeek(actor, id);
    this.ensureManagerTenant(actor, week.tenantId);
    if (week.status === ScheduleWeekStatus.LOCKED) {
      return this.toWeekResponse(week);
    }
    const updated = await this.prisma.scheduleWeek.update({
      where: { id },
      data: { status: ScheduleWeekStatus.LOCKED, lockedAt: new Date() },
      include: this.weekInclude()
    });
    await this.createAudit(actor, "SCHEDULE_LOCKED", "ScheduleWeek", id, {
      weekStartDate: toDateOnly(week.weekStartDate)
    });
    return this.toWeekResponse(updated);
  }

  async getMe(actor: AuthUser, weekStartDateValue?: string) {
    const weekStartDate = getWeekStart(
      weekStartDateValue ? parseDateOnly(weekStartDateValue) : new Date()
    );
    const week = await this.prisma.scheduleWeek.findFirst({
      where: {
        tenantId: actor.tenantId ?? undefined,
        weekStartDate,
        status: { in: [ScheduleWeekStatus.PUBLISHED, ScheduleWeekStatus.LOCKED] }
      },
      include: {
        shifts: {
          where: { assignments: { some: { userId: actor.id } } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: { assignments: { where: { userId: actor.id } } }
        }
      }
    });

    return {
      weekStartDate: toDateOnly(weekStartDate),
      status: week?.status ?? null,
      shifts:
        week?.shifts.map((shift) => ({
          id: shift.id,
          date: toDateOnly(shift.date),
          startTime: shift.startTime,
          endTime: shift.endTime,
          label: shift.label,
          note: shift.note,
          scheduleWeekStatus: week.status
        })) ?? []
    };
  }

  private async getAccessibleWeek(actor: AuthUser, id: string) {
    const week = await this.prisma.scheduleWeek.findUnique({
      where: { id },
      include: this.weekInclude()
    });
    if (!week) {
      throw new NotFoundException("SCHEDULE_WEEK_NOT_FOUND");
    }
    if (actor.role !== UserRole.ADMIN && week.tenantId !== actor.tenantId) {
      throw new ForbiddenException("SCHEDULE_ACCESS_DENIED");
    }
    return week;
  }

  private async getManagerDraftWeek(actor: AuthUser, id: string) {
    const week = await this.getAccessibleWeek(actor, id);
    this.ensureManagerTenant(actor, week.tenantId);
    this.ensureDraft(week);
    return week;
  }

  private async getManagerDraftShift(actor: AuthUser, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { scheduleWeek: true, assignments: true }
    });
    if (!shift) {
      throw new NotFoundException("SHIFT_NOT_FOUND");
    }
    this.ensureManagerTenant(actor, shift.tenantId);
    this.ensureDraft(shift.scheduleWeek);
    return shift;
  }

  private validateDateInWeek(date: Date, weekStartDate: Date) {
    const weekEnd = getWeekEnd(weekStartDate);
    if (date < weekStartDate || date > weekEnd) {
      throw new BadRequestException("SHIFT_DATE_OUTSIDE_WEEK");
    }
  }

  private ensureDraft(week: { status: ScheduleWeekStatus }) {
    if (week.status !== ScheduleWeekStatus.DRAFT) {
      throw new BadRequestException("SCHEDULE_WEEK_NOT_DRAFT");
    }
  }

  private requireManagerTenant(actor: AuthUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }
    return actor.tenantId;
  }

  private ensureManagerTenant(actor: AuthUser, tenantId: string) {
    if (actor.tenantId !== tenantId) {
      throw new ForbiddenException("SCHEDULE_TENANT_DENIED");
    }
  }

  private resolveReadTenantId(
    actor: AuthUser,
    requestedTenantId: string | undefined,
    requiredForAdmin: boolean
  ) {
    if (actor.role === UserRole.ADMIN) {
      if (requiredForAdmin && !requestedTenantId) {
        throw new BadRequestException("TENANT_ID_REQUIRED");
      }
      return requestedTenantId;
    }
    return actor.tenantId ?? undefined;
  }

  private createAudit(
    actor: AuthUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Prisma.InputJsonValue
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        actorUserId: actor.id,
        action,
        entityType,
        entityId,
        metadata
      }
    });
  }

  private weekInclude() {
    return {
      tenant: { select: { id: true, name: true, slug: true } },
      shifts: {
        orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
        include: this.shiftInclude()
      }
    };
  }

  private shiftInclude() {
    return {
      assignments: {
        include: { user: this.assignmentUserSelect() }
      }
    };
  }

  private assignmentUserSelect() {
    return {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        workerType: true,
        employeeSubRole: true,
        contractHours: true
      }
    };
  }

  private toWeekResponse(week: {
    id: string;
    tenantId: string;
    weekStartDate: Date;
    status: ScheduleWeekStatus;
    publishedAt: Date | null;
    lockedAt: Date | null;
    createdByUserId: string | null;
    shifts: Array<{
      id: string;
      date: Date;
      startTime: string;
      endTime: string;
      label: string | null;
      note: string | null;
      assignments: Array<{
        id: string;
        userId: string;
        user: {
          id: string;
          firstName: string;
          lastName: string;
          workerType: string | null;
          employeeSubRole: string | null;
          contractHours: string | null;
        };
      }>;
    }>;
  }) {
    return {
      ...week,
      weekStartDate: toDateOnly(week.weekStartDate),
      shifts: week.shifts.map((shift) => ({
        ...shift,
        date: toDateOnly(shift.date)
      }))
    };
  }
}
