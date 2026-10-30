import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ContractHours, EmployeeSubRole, ManagerDayKind, ManagerMonthStatus, NotificationType, Prisma, UserRole, VacationRequestStatus } from "@prisma/client";
import type { AuthUser } from "../auth/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";
import type { ManagerRequestDto, MonthTargetsDto, ScheduleDayDto } from "./manager-schedules.dto";

function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("INVALID_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dateOnly(date) !== value) throw new BadRequestException("INVALID_DATE");
  return date;
}

function monthStart(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException("INVALID_MONTH");
  return parseDay(`${value}-01`);
}

function nextMonth(start: Date, count = 1) {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + count, 1));
}

function weekStartForDay(date: Date) {
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function monthWeekStarts(start: Date) {
  const end = nextMonth(start);
  const result: Date[] = [];
  for (const cursor = weekStartForDay(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 7)) result.push(new Date(cursor));
  return result;
}

function paidMinutes(start?: string, end?: string) {
  if (!start || !end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    throw new BadRequestException("WORK_TIMES_REQUIRED");
  }
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let duration = (eh! * 60 + em!) - (sh! * 60 + sm!);
  if (duration <= 0) duration += 1440;
  if (duration <= 60 || duration >= 1440) throw new BadRequestException("INVALID_SHIFT_LENGTH");
  return duration - 60;
}

function contractMinutes(contractHours: ContractHours | null) {
  if (contractHours === ContractHours.HOURS_4) return 240;
  if (contractHours === ContractHours.HOURS_6) return 360;
  return 480;
}

@Injectable()
export class ManagerSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private tenantId(actor: AuthUser, allowStandInManager = false) {
    const isManager = actor.employeeSubRole === EmployeeSubRole.MANAGER;
    const isStandInManager = actor.employeeSubRole === EmployeeSubRole.WORKER && actor.isStandInManager;
    if ((!isManager && !(allowStandInManager && isStandInManager)) || !actor.tenantId) {
      throw new ForbiddenException("MANAGER_REQUIRED");
    }
    return actor.tenantId;
  }

  private async owner(actor: AuthUser) {
    const tenantId = this.tenantId(actor);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerScheduleOwnerId: true } });
    if (tenant?.managerScheduleOwnerId !== actor.id) throw new ForbiddenException("SCHEDULE_OWNER_REQUIRED");
    return tenantId;
  }

  private audit(actor: AuthUser, tenantId: string, action: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { tenantId, actorUserId: actor.id, action, entityType, entityId, metadata } });
  }

  async profile(actor: AuthUser) {
    const tenantId = this.tenantId(actor);
    const [tenant, managers] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerScheduleOwnerId: true } }),
      this.prisma.user.findMany({ where: { tenantId, employeeSubRole: EmployeeSubRole.MANAGER, isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
    ]);
    return { ownerId: tenant?.managerScheduleOwnerId ?? null, isOwner: tenant?.managerScheduleOwnerId === actor.id, managers };
  }

  async assignOwner(actor: AuthUser, tenantId: string | null, userId: string) {
    if (!tenantId) throw new BadRequestException("TENANT_REQUIRED");
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerScheduleOwnerId: true } });
    if (!tenant) throw new NotFoundException("TENANT_NOT_FOUND");
    if (actor.role !== UserRole.ADMIN && (actor.tenantId !== tenantId || tenant.managerScheduleOwnerId !== actor.id)) {
      throw new ForbiddenException("SCHEDULE_OWNER_REQUIRED");
    }
    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId, role: UserRole.EMPLOYEE, employeeSubRole: EmployeeSubRole.MANAGER, isActive: true, isDeleted: false }, select: { id: true } });
    if (!target) throw new BadRequestException("ACTIVE_MANAGER_REQUIRED");
    if (tenant.managerScheduleOwnerId === userId) return { ownerId: userId };
    await this.prisma.tenant.update({ where: { id: tenantId, managerScheduleOwnerId: tenant.managerScheduleOwnerId }, data: { managerScheduleOwnerId: userId } });
    await this.audit(actor, tenantId, "MANAGER_SCHEDULE_OWNER_ASSIGNED", "Tenant", tenantId, { previousOwnerId: tenant.managerScheduleOwnerId, ownerId: userId });
    return { ownerId: userId };
  }

  async collision(actor: AuthUser, value: string) {
    return this.collisionRange(actor, value, value);
  }

  async collisionRange(actor: AuthUser, from: string, to: string) {
    const tenantId = this.tenantId(actor);
    const start = parseDay(from);
    const end = parseDay(to);
    if (end < start) throw new BadRequestException("INVALID_DATE_RANGE");
    const [day, vacation] = await Promise.all([
      this.prisma.managerDayRequest.findFirst({ where: { tenantId, date: { gte: start, lte: end }, userId: { not: actor.id } }, select: { id: true } }),
      this.prisma.vacationRequest.findFirst({ where: { tenantId, requesterUserId: { not: actor.id }, requester: { employeeSubRole: EmployeeSubRole.MANAGER }, status: { in: [VacationRequestStatus.PENDING, VacationRequestStatus.APPROVED] }, startDate: { lte: end }, endDate: { gte: start } }, select: { id: true } })
    ]);
    return { exists: Boolean(day || vacation) };
  }

  async myRequests(actor: AuthUser, month: string) {
    const tenantId = this.tenantId(actor);
    const start = monthStart(month);
    const end = nextMonth(start);
    return this.prisma.managerDayRequest.findMany({ where: { tenantId, userId: actor.id, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }).then((items) => items.map((item) => ({ ...item, date: dateOnly(item.date) })));
  }

  async saveRequest(actor: AuthUser, dto: ManagerRequestDto) {
    const tenantId = this.tenantId(actor);
    if (dto.kind !== ManagerDayKind.WORK && dto.kind !== ManagerDayKind.REST) throw new BadRequestException("INVALID_MANAGER_REQUEST_KIND");
    const date = parseDay(dto.date);
    const item = await this.prisma.managerDayRequest.upsert({
      where: { userId_date: { userId: actor.id, date } },
      create: { tenantId, userId: actor.id, date, kind: dto.kind, note: dto.note?.trim() ?? "" },
      update: { kind: dto.kind, note: dto.note?.trim() ?? "" }
    });
    await this.audit(actor, tenantId, "MANAGER_DAY_REQUEST_SAVED", "ManagerDayRequest", item.id, { date: dto.date, kind: dto.kind });
    return { ...item, date: dateOnly(item.date) };
  }

  async removeRequest(actor: AuthUser, value: string) {
    const tenantId = this.tenantId(actor);
    const date = parseDay(value);
    const deleted = await this.prisma.managerDayRequest.deleteMany({ where: { tenantId, userId: actor.id, date } });
    if (deleted.count) await this.audit(actor, tenantId, "MANAGER_DAY_REQUEST_REMOVED", "ManagerDayRequest", actor.id, { date: value });
    return { success: true };
  }

  private async ensureMonth(tenantId: string, start: Date) {
    return this.prisma.managerScheduleMonth.upsert({ where: { tenantId_monthStartDate: { tenantId, monthStartDate: start } }, create: { tenantId, monthStartDate: start }, update: {} });
  }

  private async validateScheduleRange(tenantId: string, monthId: string, from: Date, to: Date) {
    const [managers, days, vacations] = await Promise.all([
      this.prisma.user.findMany({ where: { tenantId, employeeSubRole: EmployeeSubRole.MANAGER, isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true } }),
      this.prisma.managerScheduleDay.findMany({ where: { monthId, date: { gte: from, lt: to } }, select: { userId: true, date: true, kind: true } }),
      this.prisma.vacationRequest.findMany({ where: { tenantId, requester: { employeeSubRole: EmployeeSubRole.MANAGER }, status: VacationRequestStatus.APPROVED, startDate: { lt: to }, endDate: { gte: from } }, select: { requesterUserId: true, startDate: true, endDate: true } })
    ]);
    const keyed = new Map(days.map((day) => [`${day.userId}:${dateOnly(day.date)}`, day.kind]));
    for (const vacation of vacations) {
      const cursor = new Date(vacation.startDate > from ? vacation.startDate : from);
      while (cursor < to && cursor <= vacation.endDate) {
        const date = dateOnly(cursor);
        if (keyed.get(`${vacation.requesterUserId}:${date}`) !== ManagerDayKind.VACATION) {
          throw new BadRequestException({ code: "APPROVED_VACATION_MISSING_FROM_SCHEDULE", userId: vacation.requesterUserId, date });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    for (const manager of managers) {
      for (const cursor = new Date(from); cursor < to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const date = dateOnly(cursor);
        if (!keyed.has(`${manager.id}:${date}`)) {
          throw new BadRequestException({ code: "INCOMPLETE_MANAGER_SCHEDULE", userId: manager.id, managerName: `${manager.lastName} ${manager.firstName}`, date });
        }
      }
    }
  }

  async setTargets(actor: AuthUser, month: string, dto: MonthTargetsDto) {
    const tenantId = await this.owner(actor);
    const start = monthStart(month);
    const record = await this.ensureMonth(tenantId, start);
    if (record.status !== ManagerMonthStatus.DRAFT) throw new BadRequestException("MONTH_REOPEN_REQUIRED");
    const updated = await this.prisma.managerScheduleMonth.update({ where: { id: record.id }, data: { expectedWorkDays: dto.expectedWorkDays, expectedRestDays: dto.expectedRestDays } });
    await this.audit(actor, tenantId, "MANAGER_MONTH_TARGETS_UPDATED", "ManagerScheduleMonth", record.id, { month, ...dto });
    return updated;
  }

  async setDay(actor: AuthUser, month: string, dto: ScheduleDayDto) {
    const tenantId = await this.owner(actor);
    const start = monthStart(month);
    const end = nextMonth(start);
    const date = parseDay(dto.date);
    if (date < start || date >= end) throw new BadRequestException("DATE_OUTSIDE_MONTH");
    const target = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId, role: UserRole.EMPLOYEE, OR: [{ employeeSubRole: EmployeeSubRole.MANAGER }, { employeeSubRole: EmployeeSubRole.WORKER, isStandInManager: true }], isActive: true, isDeleted: false }, select: { id: true, contractHours: true } });
    if (!target) throw new BadRequestException("ACTIVE_MANAGER_REQUIRED");
    const record = await this.ensureMonth(tenantId, start);
    if (record.status !== ManagerMonthStatus.DRAFT) throw new BadRequestException("MONTH_REOPEN_REQUIRED");
    const week = await this.prisma.managerScheduleWeek.findUnique({ where: { monthId_weekStartDate: { monthId: record.id, weekStartDate: weekStartForDay(date) } }, select: { status: true } });
    if (week?.status === ManagerMonthStatus.PUBLISHED) throw new BadRequestException("WEEK_REOPEN_REQUIRED");
    const approved = await this.prisma.vacationRequest.findFirst({ where: { tenantId, requesterUserId: dto.userId, status: VacationRequestStatus.APPROVED, startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
    if (approved && dto.kind !== ManagerDayKind.VACATION) throw new BadRequestException("APPROVED_VACATION_REQUIRED");
    const isFullPaidDay = dto.kind === ManagerDayKind.VACATION || dto.kind === ManagerDayKind.SICK_LEAVE;
    const minutes = dto.kind === ManagerDayKind.WORK ? paidMinutes(dto.startTime, dto.endTime) : isFullPaidDay ? contractMinutes(target.contractHours) : 0;
    const data = { kind: dto.kind, startTime: dto.kind === ManagerDayKind.WORK ? dto.startTime : null, endTime: dto.kind === ManagerDayKind.WORK ? dto.endTime : null, note: dto.note?.trim() ?? "", paidMinutes: minutes };
    const item = await this.prisma.managerScheduleDay.upsert({ where: { monthId_userId_date: { monthId: record.id, userId: dto.userId, date } }, create: { monthId: record.id, userId: dto.userId, date, ...data }, update: data });
    await this.audit(actor, tenantId, "MANAGER_SCHEDULE_DAY_UPDATED", "ManagerScheduleDay", item.id, { month, userId: dto.userId, date: dto.date, kind: dto.kind, startTime: data.startTime, endTime: data.endTime, paidMinutes: minutes });
    return { ...item, date: dateOnly(item.date) };
  }

  async setStatus(actor: AuthUser, month: string, status: ManagerMonthStatus) {
    const tenantId = await this.owner(actor);
    const start = monthStart(month);
    const record = await this.ensureMonth(tenantId, start);
    if (record.status === status) return record;
    if (status === ManagerMonthStatus.PUBLISHED) {
      if (record.expectedWorkDays + record.expectedRestDays === 0) throw new BadRequestException("MONTH_TARGETS_REQUIRED");
      const end = nextMonth(start);
      await this.validateScheduleRange(tenantId, record.id, start, end);
    }
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.managerScheduleMonth.update({
        where: { id: record.id },
        data: {
          status,
          publishedAt: status === ManagerMonthStatus.PUBLISHED ? new Date() : null,
          ...(status === ManagerMonthStatus.PUBLISHED ? { publicationCount: { increment: 1 } } : {})
        }
      });
      await transaction.auditLog.create({
        data: { tenantId, actorUserId: actor.id, action: status === ManagerMonthStatus.PUBLISHED ? "MANAGER_MONTH_PUBLISHED" : "MANAGER_MONTH_REOPENED", entityType: "ManagerScheduleMonth", entityId: record.id, metadata: { month } }
      });
      if (status === ManagerMonthStatus.PUBLISHED) {
        for (const weekStartDate of monthWeekStarts(start)) {
          await transaction.managerScheduleWeek.upsert({
            where: { monthId_weekStartDate: { monthId: record.id, weekStartDate } },
            create: { monthId: record.id, weekStartDate, status, publishedAt: new Date(), publicationCount: 1 },
            update: { status, publishedAt: new Date(), publicationCount: { increment: 1 } }
          });
        }
      } else {
        await transaction.managerScheduleWeek.updateMany({ where: { monthId: record.id }, data: { status, publishedAt: null } });
      }
      if (status === ManagerMonthStatus.PUBLISHED) {
        const recipients = await transaction.user.findMany({
          where: { tenantId, employeeSubRole: EmployeeSubRole.MANAGER, isActive: true, isDeleted: false },
          select: { id: true }
        });
        await transaction.notification.createMany({
          data: recipients.map((recipient) => ({
            tenantId, recipientUserId: recipient.id, actorUserId: actor.id,
            type: updated.publicationCount === 1 ? NotificationType.MANAGER_SCHEDULE_PUBLISHED : NotificationType.MANAGER_SCHEDULE_UPDATED,
            scheduleMonth: month,
            deduplicationKey: `manager-schedule:${record.id}:${updated.publicationCount}:${recipient.id}`
          })),
          skipDuplicates: true
        });
      }
      return updated;
    });
  }

  async setWeekStatus(actor: AuthUser, month: string, weekStartValue: string, status: ManagerMonthStatus) {
    const tenantId = await this.owner(actor);
    const start = monthStart(month);
    const end = nextMonth(start);
    const weekStartDate = parseDay(weekStartValue);
    if (weekStartDate.getUTCDay() !== 1) throw new BadRequestException("WEEK_MUST_START_MONDAY");
    const weekEnd = new Date(weekStartDate);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    if (weekStartDate >= end || weekEnd <= start) throw new BadRequestException("WEEK_OUTSIDE_MONTH");
    const record = await this.ensureMonth(tenantId, start);
    if (record.status !== ManagerMonthStatus.DRAFT) throw new BadRequestException("MONTH_REOPEN_REQUIRED");
    const from = weekStartDate > start ? weekStartDate : start;
    const to = weekEnd < end ? weekEnd : end;
    if (status === ManagerMonthStatus.PUBLISHED) await this.validateScheduleRange(tenantId, record.id, from, to);
    const item = await this.prisma.managerScheduleWeek.upsert({
      where: { monthId_weekStartDate: { monthId: record.id, weekStartDate } },
      create: { monthId: record.id, weekStartDate, status, publishedAt: status === ManagerMonthStatus.PUBLISHED ? new Date() : null, publicationCount: status === ManagerMonthStatus.PUBLISHED ? 1 : 0 },
      update: { status, publishedAt: status === ManagerMonthStatus.PUBLISHED ? new Date() : null, ...(status === ManagerMonthStatus.PUBLISHED ? { publicationCount: { increment: 1 } } : {}) }
    });
    await this.audit(actor, tenantId, status === ManagerMonthStatus.PUBLISHED ? "MANAGER_WEEK_PUBLISHED" : "MANAGER_WEEK_REOPENED", "ManagerScheduleWeek", item.id, { month, weekStart: weekStartValue });
    return { weekStart: weekStartValue, status: item.status };
  }

  async getWeek(actor: AuthUser, value: string) {
    const tenantId = this.tenantId(actor, true);
    const start = parseDay(value);
    if (start.getUTCDay() !== 1) throw new BadRequestException("WEEK_MUST_START_MONDAY");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const [managers, days] = await Promise.all([
      this.prisma.user.findMany({ where: { tenantId, role: UserRole.EMPLOYEE, OR: [{ employeeSubRole: EmployeeSubRole.MANAGER }, { employeeSubRole: EmployeeSubRole.WORKER, isStandInManager: true }], isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true, isStandInManager: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
      this.prisma.managerScheduleDay.findMany({ where: { date: { gte: start, lt: end }, month: { tenantId, OR: [{ status: ManagerMonthStatus.PUBLISHED }, { weeks: { some: { weekStartDate: start, status: ManagerMonthStatus.PUBLISHED } } }] } }, select: { userId: true, date: true, kind: true, startTime: true, endTime: true, note: true } })
    ]);
    const activeIds = new Set(managers.map((manager) => manager.id));
    return { weekStart: value, managers, days: days.filter((day) => activeIds.has(day.userId)).map((day) => ({ ...day, date: dateOnly(day.date) })) };
  }

  async getMonth(actor: AuthUser, month: string) {
    const tenantId = this.tenantId(actor, true);
    const start = monthStart(month);
    const end = nextMonth(start);
    const cycleStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - (start.getUTCMonth() % 2), 1));
    const cycleEnd = nextMonth(cycleStart, 2);
    const [tenant, managers, months, requests, vacations] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerScheduleOwnerId: true } }),
      this.prisma.user.findMany({ where: { tenantId, role: UserRole.EMPLOYEE, OR: [{ employeeSubRole: EmployeeSubRole.MANAGER }, { employeeSubRole: EmployeeSubRole.WORKER, isStandInManager: true }], isActive: true, isDeleted: false }, select: { id: true, firstName: true, lastName: true, isStandInManager: true, contractHours: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
      this.prisma.managerScheduleMonth.findMany({ where: { tenantId, monthStartDate: { gte: cycleStart, lt: cycleEnd } }, include: { days: true, weeks: true } }),
      this.prisma.managerDayRequest.findMany({ where: { tenantId, date: { gte: start, lt: end } } }),
      this.prisma.vacationRequest.findMany({ where: { tenantId, requester: { employeeSubRole: EmployeeSubRole.MANAGER }, status: { in: [VacationRequestStatus.PENDING, VacationRequestStatus.APPROVED] }, startDate: { lt: cycleEnd }, endDate: { gte: cycleStart } }, select: { id: true, requesterUserId: true, startDate: true, endDate: true, status: true, reason: true } })
    ]);
    const isOwner = tenant?.managerScheduleOwnerId === actor.id;
    const current = months.find((item) => item.monthStartDate.getTime() === start.getTime());
    const publishedWeekStarts = new Set((current?.weeks ?? []).filter((week) => week.status === ManagerMonthStatus.PUBLISHED).map((week) => dateOnly(week.weekStartDate)));
    const visibleMonth = isOwner || current?.status === ManagerMonthStatus.PUBLISHED || publishedWeekStarts.size > 0;
    const visibleManagers = managers;
    const visibleManagerIds = new Set(visibleManagers.map((manager) => manager.id));
    const dayRows = visibleMonth ? (current?.days ?? []).filter((day) => visibleManagerIds.has(day.userId) && (isOwner || current?.status === ManagerMonthStatus.PUBLISHED || publishedWeekStarts.has(dateOnly(weekStartForDay(day.date))))) : [];
    const boundaryStart = new Date(start);
    boundaryStart.setUTCDate(boundaryStart.getUTCDate() - 5);
    const boundaryEnd = new Date(end);
    boundaryEnd.setUTCDate(boundaryEnd.getUTCDate() + 5);
    const contextDays = isOwner ? await this.prisma.managerScheduleDay.findMany({
      where: {
        userId: { in: visibleManagers.map((item) => item.id) },
        date: { gte: boundaryStart, lt: boundaryEnd },
        month: { tenantId }
      }
    }) : [];
    const requestRows = requests.filter((item) => isOwner || item.userId === actor.id).map((item) => ({ userId: item.userId, date: dateOnly(item.date), kind: item.kind, note: item.note }));
    const vacationRows = vacations.filter((item) => (isOwner || item.requesterUserId === actor.id) && item.startDate < end && item.endDate >= start).map((item) => ({ ...item, startDate: dateOnly(item.startDate), endDate: dateOnly(item.endDate) }));
    const approvedDates = new Set<string>();
    for (const vacation of vacations.filter((item) => item.status === VacationRequestStatus.APPROVED)) {
      const first = vacation.startDate > cycleStart ? vacation.startDate : cycleStart;
      for (const cursor = new Date(first); cursor < cycleEnd && cursor <= vacation.endDate; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        approvedDates.add(`${vacation.requesterUserId}:${dateOnly(cursor)}`);
      }
    }
    const contractMinutesByUserId = new Map(visibleManagers.map((manager) => [manager.id, contractMinutes(manager.contractHours)]));
    const actualMinutes = (day: { userId: string; date: Date; kind: ManagerDayKind; paidMinutes: number }) =>
      approvedDates.has(`${day.userId}:${dateOnly(day.date)}`) || day.kind === ManagerDayKind.VACATION || day.kind === ManagerDayKind.SICK_LEAVE ? contractMinutesByUserId.get(day.userId) ?? 480 : day.paidMinutes;
    const balance = visibleManagers.filter((manager) => !manager.isStandInManager && (isOwner || manager.id === actor.id)).map((manager) => {
      const approvedForManager = [...approvedDates]
        .filter((key) => key.startsWith(`${manager.id}:`))
        .map((key) => key.slice(manager.id.length + 1));
      const managerCurrentDays = dayRows.filter((day) => day.userId === manager.id);
      const currentScheduledDates = new Set(managerCurrentDays.map((day) => dateOnly(day.date)));
      const currentVacationOnly = approvedForManager.filter((date) => date >= dateOnly(start) && date < dateOnly(end) && !currentScheduledDates.has(date)).length;
      const dailyContractMinutes = contractMinutes(manager.contractHours);
      const currentMinutes = managerCurrentDays.reduce((sum, day) => sum + actualMinutes(day), 0) + currentVacationOnly * dailyContractMinutes;
      const currentRestDays = managerCurrentDays.filter((day) => day.kind === ManagerDayKind.REST && !approvedDates.has(`${manager.id}:${dateOnly(day.date)}`)).length;
      const cycleMonths = months.filter((item) => isOwner || item.status === ManagerMonthStatus.PUBLISHED);
      const cycleDays = cycleMonths.flatMap((item) => item.days).filter((day) => day.userId === manager.id);
      const cycleScheduledDates = new Set(cycleDays.map((day) => dateOnly(day.date)));
      const cycleVacationOnly = approvedForManager.filter((date) => !cycleScheduledDates.has(date)).length;
      const cycleMinutes = cycleDays.reduce((sum, day) => sum + actualMinutes(day), 0) + cycleVacationOnly * dailyContractMinutes;
      const expectedCurrentMinutes = (current?.expectedWorkDays ?? 0) * dailyContractMinutes;
      const expectedCycleMinutes = cycleMonths.reduce((sum, item) => sum + item.expectedWorkDays * dailyContractMinutes, 0);
      return { userId: manager.id, currentMinutes, expectedCurrentMinutes, currentRestDays, monthDifferenceMinutes: currentMinutes - expectedCurrentMinutes, cycleDifferenceMinutes: cycleMinutes - expectedCycleMinutes };
    });
    return {
      month, status: visibleMonth ? current?.status ?? ManagerMonthStatus.DRAFT : ManagerMonthStatus.DRAFT,
      isOwner, ownerId: tenant?.managerScheduleOwnerId ?? null,
      expectedWorkDays: visibleMonth ? current?.expectedWorkDays ?? 0 : 0,
      expectedRestDays: visibleMonth ? current?.expectedRestDays ?? 0 : 0,
      cycleStart: dateOnly(cycleStart), cycleEnd: dateOnly(new Date(cycleEnd.getTime() - 86400000)),
      weeks: monthWeekStarts(start).map((weekStartDate) => ({ weekStart: dateOnly(weekStartDate), status: current?.status === ManagerMonthStatus.PUBLISHED ? ManagerMonthStatus.PUBLISHED : current?.weeks.find((week) => week.weekStartDate.getTime() === weekStartDate.getTime())?.status ?? ManagerMonthStatus.DRAFT })),
      managers: visibleManagers,
      days: dayRows.map((item) => ({ userId: item.userId, date: dateOnly(item.date), kind: item.kind, startTime: item.startTime, endTime: item.endTime, note: item.note, paidMinutes: item.kind === ManagerDayKind.VACATION || item.kind === ManagerDayKind.SICK_LEAVE ? contractMinutesByUserId.get(item.userId) ?? 480 : item.paidMinutes })),
      contextDays: contextDays.map((item) => ({ userId: item.userId, date: dateOnly(item.date), kind: item.kind, startTime: item.startTime, endTime: item.endTime, note: item.note, paidMinutes: item.kind === ManagerDayKind.VACATION || item.kind === ManagerDayKind.SICK_LEAVE ? contractMinutesByUserId.get(item.userId) ?? 480 : item.paidMinutes })),
      requests: requestRows, vacations: vacationRows, balance
    };
  }
}
