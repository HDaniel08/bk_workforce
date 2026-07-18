import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  AvailabilityDayType,
  AvailabilityPeriodType,
  AvailabilitySubmissionStatus,
  EmployeeSubRole,
  Prisma,
  UserRole,
  WorkPreference,
  WorkerType
} from "@prisma/client";
import type { AuthUser } from "../auth/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";
import type {
  MyAvailabilityQueryDto,
  TeamAvailabilityQueryDto
} from "./dto/availability-query.dto";
import type { AvailabilityDayDto } from "./dto/availability-day.dto";
import type { SaveAvailabilityDto } from "./dto/save-availability.dto";
import type { UpdateTeamAvailabilityDayDto } from "./dto/update-team-availability-day.dto";
import {
  generateMonthDays,
  generateWeekDays,
  getMonthEnd,
  getMonthStart,
  getWeekEnd,
  getWeekStart,
  parseDateOnly,
  toDateOnly
} from "./helpers/date.helpers";

type Period = {
  type: AvailabilityPeriodType;
  startDate: Date;
  endDate: Date;
  weekStartDate: Date | null;
  monthStartDate: Date | null;
};

type DefaultAvailabilityDay = {
  type: AvailabilityDayType;
  workPreference: WorkPreference | null;
  startTime: string | null;
  endTime: string | null;
  note: string;
};

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthUser, query: MyAvailabilityQueryDto) {
    const period = this.resolveOwnPeriod(user, query);
    const record = await this.findAvailability(user.id, period);
    return {
      period: this.toPeriodResponse(period),
      availability: this.toAvailabilityResponse(
        record,
        period,
        true,
        this.getDefaultAvailabilityDay(user)
      )
    };
  }

  async getOpenSubmissionWeeks(user: AuthUser) {
    if (user.employeeSubRole !== EmployeeSubRole.WORKER || !user.tenantId) {
      throw new ForbiddenException("WORKER_TENANT_REQUIRED");
    }

    const weeks = await this.prisma.availabilitySubmissionWeek.findMany({
      where: {
        tenantId: user.tenantId,
        status: AvailabilitySubmissionStatus.OPEN
      },
      orderBy: { weekStartDate: "asc" }
    });

    return weeks.map((week) => ({
      weekStartDate: toDateOnly(week.weekStartDate),
      status: week.status,
      openedAt: week.openedAt,
      closedAt: week.closedAt
    }));
  }

  async getClosedSubmissionWeeks(actor: AuthUser) {
    const tenantId = this.requireManagerTenant(actor);
    const weeks = await this.prisma.availabilitySubmissionWeek.findMany({
      where: {
        tenantId,
        status: AvailabilitySubmissionStatus.CLOSED
      },
      orderBy: { weekStartDate: "desc" }
    });

    return weeks.map((week) => ({
      weekStartDate: toDateOnly(week.weekStartDate),
      status: week.status,
      openedAt: week.openedAt,
      closedAt: week.closedAt
    }));
  }

  async saveMe(user: AuthUser, dto: SaveAvailabilityDto, submit: boolean) {
    if (!user.tenantId) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }

    const period = this.resolvePayloadPeriod(user, dto);
    await this.ensureSubmissionWindowOpen(user, period);
    const normalizedDays = this.validateAndNormalizeDays(dto.days, period, submit);
    const existing = await this.findAvailability(user.id, period);

    const availability = await this.prisma.availabilityWeek.upsert({
      where: { id: existing?.id ?? "" },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        periodType: period.type,
        weekStartDate: period.weekStartDate,
        monthStartDate: period.monthStartDate,
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
        days: {
          create: normalizedDays
        }
      },
      update: {
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
        days: {
          deleteMany: {},
          create: normalizedDays
        }
      },
      include: { days: { orderBy: { date: "asc" } } }
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: submit ? "AVAILABILITY_SUBMITTED" : "AVAILABILITY_DRAFT_SAVED",
        entityType: "AvailabilityWeek",
        entityId: availability.id,
        metadata: {
          periodType: period.type,
          weekStartDate: period.weekStartDate ? toDateOnly(period.weekStartDate) : null,
          monthStartDate: period.monthStartDate ? toDateOnly(period.monthStartDate) : null,
          daysCount: normalizedDays.length
        }
      }
    });

    return {
      period: this.toPeriodResponse(period),
      availability: this.toAvailabilityResponse(
        availability,
        period,
        true,
        this.getDefaultAvailabilityDay(user)
      )
    };
  }

  async getTeam(actor: AuthUser, query: TeamAvailabilityQueryDto) {
    const tenantId = this.resolveTeamTenantId(actor, query.tenantId);
    const period = this.resolveTeamPeriod(query);
    const where: Prisma.UserWhereInput = {
      tenantId,
      isActive: true,
      isDeleted: false,
      role: UserRole.EMPLOYEE
    };

    if (query.userId) {
      where.id = query.userId;
    }
    if (query.employeeSubRole) {
      where.employeeSubRole = query.employeeSubRole;
    }
    if (query.workerType) {
      where.workerType = query.workerType;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: [{ employeeSubRole: "asc" }, { lastName: "asc" }],
      include: {
        availabilityWeeks: {
          where: this.availabilityWhere(period),
          include: { days: { orderBy: { date: "asc" } } }
        }
      }
    });

    return {
      period: this.toPeriodResponse(period),
      users: users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        employeeSubRole: user.employeeSubRole,
        workerType: user.workerType,
        contractHours: user.contractHours,
        availability: this.toAvailabilityResponse(
          user.availabilityWeeks[0] ?? null,
          period,
          false
        )
      }))
    };
  }

  async updateTeamDay(
    actor: AuthUser,
    userId: string,
    dto: UpdateTeamAvailabilityDayDto
  ) {
    const tenantId = this.requireManagerTenant(actor);
    const periodType = dto.periodType ?? AvailabilityPeriodType.WEEKLY;
    const targetEmployeeSubRole =
      periodType === AvailabilityPeriodType.MONTHLY
        ? EmployeeSubRole.MANAGER
        : EmployeeSubRole.WORKER;
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isActive: true,
        isDeleted: false,
        role: UserRole.EMPLOYEE,
        employeeSubRole: targetEmployeeSubRole
      }
    });

    if (!targetUser) {
      throw new ForbiddenException("USER_NOT_FOUND_IN_TENANT");
    }

    const period =
      periodType === AvailabilityPeriodType.MONTHLY
        ? this.resolveMonthlyTeamUpdatePeriod(dto.monthStartDate)
        : this.resolveWeeklyTeamUpdatePeriod(dto.weekStartDate);
    const periodStartDate = period.monthStartDate ?? period.weekStartDate;
    if (!periodStartDate) {
      throw new BadRequestException("PERIOD_START_REQUIRED");
    }
    const normalizedDays = this.validateAndNormalizeDays([dto.day], period, false);
    const normalizedDay = normalizedDays[0];
    if (!normalizedDay) {
      throw new BadRequestException("DAY_REQUIRED");
    }
    const dayDate = parseDateOnly(dto.day.date);
    const existing = await this.findAvailability(userId, period);
    const nextStatus = existing?.status === "LOCKED" ? "LOCKED" : "SUBMITTED";

    const availability = existing
      ? await this.prisma.availabilityWeek.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            submittedAt: nextStatus === "SUBMITTED" ? new Date() : existing.submittedAt,
            days: {
              deleteMany: { date: dayDate },
              create: normalizedDay
            }
          },
          include: { days: { orderBy: { date: "asc" } } }
        })
      : await this.prisma.availabilityWeek.create({
          data: {
            tenantId,
            userId,
            periodType,
            weekStartDate: period.weekStartDate,
            monthStartDate: period.monthStartDate,
            status: "SUBMITTED",
            submittedAt: new Date(),
            days: { create: normalizedDay }
          },
          include: { days: { orderBy: { date: "asc" } } }
        });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: actor.id,
        action: "AVAILABILITY_TEAM_DAY_UPDATED",
        entityType: "AvailabilityWeek",
        entityId: availability.id,
        metadata: {
          targetUserId: userId,
          periodType,
          weekStartDate: period.weekStartDate ? toDateOnly(period.weekStartDate) : null,
          monthStartDate: period.monthStartDate ? toDateOnly(period.monthStartDate) : null,
          date: toDateOnly(dayDate),
          type: normalizedDay.type
        }
      }
    });

    return {
      period: this.toPeriodResponse(period),
      availability: this.toAvailabilityResponse(availability, period, false)
    };
  }

  private resolveWeeklyTeamUpdatePeriod(weekStartDateValue?: string | null): Period {
    if (!weekStartDateValue) {
      throw new BadRequestException("WEEK_START_DATE_REQUIRED");
    }

    const weekStartDate = getWeekStart(parseDateOnly(weekStartDateValue));
    return {
      type: AvailabilityPeriodType.WEEKLY,
      startDate: weekStartDate,
      endDate: getWeekEnd(weekStartDate),
      weekStartDate,
      monthStartDate: null
    };
  }

  private resolveMonthlyTeamUpdatePeriod(monthStartDateValue?: string | null): Period {
    if (!monthStartDateValue) {
      throw new BadRequestException("MONTH_START_DATE_REQUIRED");
    }

    const monthStartDate = getMonthStart(parseDateOnly(monthStartDateValue));
    return {
      type: AvailabilityPeriodType.MONTHLY,
      startDate: monthStartDate,
      endDate: getMonthEnd(monthStartDate),
      weekStartDate: null,
      monthStartDate
    };
  }

  async getRequiredMissing(actor: AuthUser, weekStartDateValue: string) {
    if (actor.employeeSubRole !== EmployeeSubRole.MANAGER || !actor.tenantId) {
      throw new ForbiddenException("MANAGER_REQUIRED");
    }

    const weekStartDate = getWeekStart(parseDateOnly(weekStartDateValue));
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        isDeleted: false,
        role: UserRole.EMPLOYEE,
        employeeSubRole: EmployeeSubRole.WORKER,
        workerType: WorkerType.STUDENT,
        availabilityWeeks: {
          none: {
            periodType: AvailabilityPeriodType.WEEKLY,
            weekStartDate,
            status: "SUBMITTED"
          }
        }
      },
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    return users;
  }

  async getSubmissionWeek(actor: AuthUser, weekStartDateValue: string) {
    const tenantId = this.requireManagerTenant(actor);
    const weekStartDate = getWeekStart(parseDateOnly(weekStartDateValue));
    const submissionWeek = await this.prisma.availabilitySubmissionWeek.findUnique({
      where: { tenantId_weekStartDate: { tenantId, weekStartDate } }
    });

    return {
      weekStartDate: toDateOnly(weekStartDate),
      status: submissionWeek?.status ?? null,
      openedAt: submissionWeek?.openedAt ?? null,
      closedAt: submissionWeek?.closedAt ?? null
    };
  }

  async openSubmissionWeek(actor: AuthUser, weekStartDateValue: string) {
    const tenantId = this.requireManagerTenant(actor);
    const weekStartDate = getWeekStart(parseDateOnly(weekStartDateValue));
    const submissionWeek = await this.prisma.availabilitySubmissionWeek.upsert({
      where: { tenantId_weekStartDate: { tenantId, weekStartDate } },
      create: {
        tenantId,
        weekStartDate,
        status: AvailabilitySubmissionStatus.OPEN,
        openedByUserId: actor.id
      },
      update: {
        status: AvailabilitySubmissionStatus.OPEN,
        openedByUserId: actor.id,
        openedAt: new Date(),
        closedByUserId: null,
        closedAt: null
      }
    });

    return {
      weekStartDate: toDateOnly(submissionWeek.weekStartDate),
      status: submissionWeek.status,
      openedAt: submissionWeek.openedAt,
      closedAt: submissionWeek.closedAt
    };
  }

  async closeSubmissionWeek(actor: AuthUser, weekStartDateValue: string) {
    const tenantId = this.requireManagerTenant(actor);
    const weekStartDate = getWeekStart(parseDateOnly(weekStartDateValue));
    const closedAt = new Date();
    const submissionWeek = await this.prisma.availabilitySubmissionWeek.upsert({
      where: { tenantId_weekStartDate: { tenantId, weekStartDate } },
      create: {
        tenantId,
        weekStartDate,
        status: AvailabilitySubmissionStatus.CLOSED,
        openedByUserId: actor.id,
        closedByUserId: actor.id,
        closedAt
      },
      update: {
        status: AvailabilitySubmissionStatus.CLOSED,
        closedByUserId: actor.id,
        closedAt
      }
    });

    await this.prisma.availabilityWeek.updateMany({
      where: {
        tenantId,
        periodType: AvailabilityPeriodType.WEEKLY,
        weekStartDate,
        status: "DRAFT"
      },
      data: {
        status: "LOCKED",
        submittedAt: closedAt
      }
    });

    await this.prisma.availabilityWeek.updateMany({
      where: {
        tenantId,
        periodType: AvailabilityPeriodType.WEEKLY,
        weekStartDate,
        status: { not: "LOCKED" }
      },
      data: {
        status: "LOCKED"
      }
    });

    return {
      weekStartDate: toDateOnly(submissionWeek.weekStartDate),
      status: submissionWeek.status,
      openedAt: submissionWeek.openedAt,
      closedAt: submissionWeek.closedAt
    };
  }

  private resolveOwnPeriod(user: AuthUser, query: MyAvailabilityQueryDto): Period {
    if (user.employeeSubRole === EmployeeSubRole.MANAGER) {
      const baseDate = query.monthStartDate ? parseDateOnly(query.monthStartDate) : new Date();
      const monthStartDate = getMonthStart(baseDate);
      return {
        type: AvailabilityPeriodType.MONTHLY,
        startDate: monthStartDate,
        endDate: getMonthEnd(monthStartDate),
        weekStartDate: null,
        monthStartDate
      };
    }

    if (user.employeeSubRole === EmployeeSubRole.WORKER) {
      const baseDate = query.weekStartDate ? parseDateOnly(query.weekStartDate) : new Date();
      const weekStartDate = getWeekStart(baseDate);
      return {
        type: AvailabilityPeriodType.WEEKLY,
        startDate: weekStartDate,
        endDate: getWeekEnd(weekStartDate),
        weekStartDate,
        monthStartDate: null
      };
    }

    throw new ForbiddenException("AVAILABILITY_NOT_ALLOWED");
  }

  private resolvePayloadPeriod(user: AuthUser, dto: SaveAvailabilityDto): Period {
    const expectedType =
      user.employeeSubRole === EmployeeSubRole.MANAGER
        ? AvailabilityPeriodType.MONTHLY
        : AvailabilityPeriodType.WEEKLY;

    if (dto.periodType !== expectedType) {
      throw new BadRequestException("INVALID_PERIOD_TYPE");
    }

    return this.resolveOwnPeriod(user, {
      weekStartDate: dto.weekStartDate ?? undefined,
      monthStartDate: dto.monthStartDate ?? undefined
    });
  }

  private resolveTeamPeriod(query: TeamAvailabilityQueryDto): Period {
    if (query.monthStartDate && !query.weekStartDate) {
      const monthStartDate = getMonthStart(parseDateOnly(query.monthStartDate));
      return {
        type: AvailabilityPeriodType.MONTHLY,
        startDate: monthStartDate,
        endDate: getMonthEnd(monthStartDate),
        weekStartDate: null,
        monthStartDate
      };
    }

    const weekStartDate = getWeekStart(
      query.weekStartDate ? parseDateOnly(query.weekStartDate) : new Date()
    );
    return {
      type: AvailabilityPeriodType.WEEKLY,
      startDate: weekStartDate,
      endDate: getWeekEnd(weekStartDate),
      weekStartDate,
      monthStartDate: null
    };
  }

  private resolveTeamTenantId(actor: AuthUser, requestedTenantId?: string) {
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

  private requireManagerTenant(actor: AuthUser) {
    if (actor.employeeSubRole !== EmployeeSubRole.MANAGER || !actor.tenantId) {
      throw new ForbiddenException("MANAGER_TENANT_REQUIRED");
    }

    return actor.tenantId;
  }

  private async ensureSubmissionWindowOpen(user: AuthUser, period: Period) {
    if (period.type !== AvailabilityPeriodType.WEEKLY) {
      return;
    }

    if (!user.tenantId || !period.weekStartDate) {
      throw new ForbiddenException("TENANT_REQUIRED");
    }

    const submissionWeek = await this.prisma.availabilitySubmissionWeek.findUnique({
      where: {
        tenantId_weekStartDate: {
          tenantId: user.tenantId,
          weekStartDate: period.weekStartDate
        }
      }
    });

    if (!submissionWeek || submissionWeek.status !== AvailabilitySubmissionStatus.OPEN) {
      throw new BadRequestException("AVAILABILITY_WEEK_NOT_OPEN");
    }
  }

  private async findAvailability(userId: string, period: Period) {
    return this.prisma.availabilityWeek.findFirst({
      where: {
        userId,
        ...this.availabilityWhere(period)
      },
      include: { days: { orderBy: { date: "asc" } } }
    });
  }

  private availabilityWhere(period: Period): Prisma.AvailabilityWeekWhereInput {
    return {
      periodType: period.type,
      weekStartDate: period.weekStartDate,
      monthStartDate: period.monthStartDate
    };
  }

  private validateAndNormalizeDays(
    days: AvailabilityDayDto[],
    period: Period,
    submit: boolean
  ): Prisma.AvailabilityDayCreateWithoutAvailabilityWeekInput[] {
    const expectedDates = new Set(
      this.generatePeriodDates(period).map((date) => toDateOnly(date))
    );

    if (submit && days.length !== expectedDates.size) {
      throw new BadRequestException("PERIOD_DAYS_REQUIRED");
    }

    return days.map((day) => {
      const date = parseDateOnly(day.date);
      const dateOnly = toDateOnly(date);

      if (!expectedDates.has(dateOnly)) {
        throw new BadRequestException("DAY_OUTSIDE_PERIOD");
      }

      if (day.type === AvailabilityDayType.VACATION) {
        throw new BadRequestException("VACATION_CANNOT_BE_SELECTED_MANUALLY");
      }

      if (day.type !== AvailabilityDayType.WORK) {
        return {
          date,
          type: day.type,
          workPreference: null,
          startTime: null,
          endTime: null,
          note: day.note || null
        };
      }

      if (!day.workPreference) {
        throw new BadRequestException("WORK_PREFERENCE_REQUIRED");
      }

      const startTime =
        day.workPreference === WorkPreference.TIME_RANGE
          ? day.startTime || "07:00"
          : null;
      const endTime =
        day.workPreference === WorkPreference.TIME_RANGE
          ? day.endTime || "01:00"
          : null;

      if (startTime && endTime) {
        this.validateTimeWindow(startTime);
        this.validateTimeWindow(endTime);
      }

      return {
        date,
        type: day.type,
        workPreference: day.workPreference,
        startTime,
        endTime,
        note: day.note || null
      };
    });
  }

  private validateTimeWindow(value: string) {
    const [hoursText, minutesText] = value.split(":");
    const minutes = Number(hoursText) * 60 + Number(minutesText);
    const earliest = 7 * 60;
    const latestSameDay = 24 * 60;
    const latestNextDay = 60;

    if (minutes >= earliest && minutes < latestSameDay) {
      return;
    }

    if (minutes >= 0 && minutes <= latestNextDay) {
      return;
    }

    throw new BadRequestException("TIME_OUTSIDE_ALLOWED_WINDOW");
  }

  private toAvailabilityResponse(
    availability:
      | ({
          days: Array<{
            date: Date;
            type: AvailabilityDayType;
            workPreference: WorkPreference | null;
            startTime: string | null;
            endTime: string | null;
            note: string | null;
          }>;
        } & {
          status: string;
          submittedAt: Date | null;
        })
      | null,
    period: Period,
    fillMissingDays = true,
    defaultDay: DefaultAvailabilityDay = this.getRestDayDefault()
  ) {
    if (!availability) {
      return {
        status: "DRAFT",
        submittedAt: null,
        days: fillMissingDays
          ? this.generatePeriodDates(period).map((date) => ({
              date: toDateOnly(date),
              ...defaultDay
            }))
          : []
      };
    }

    const storedDays = availability.days.map((day) => ({
      date: toDateOnly(day.date),
      type: day.type,
      workPreference: day.workPreference,
      startTime: day.startTime,
      endTime: day.endTime,
      note: day.note ?? ""
    }));

    const storedDaysByDate = new Map(storedDays.map((day) => [day.date, day]));

    return {
      status: availability.status,
      submittedAt: availability.submittedAt,
      days: fillMissingDays
        ? this.generatePeriodDates(period).map((date) => {
            const dateOnly = toDateOnly(date);
            return (
              storedDaysByDate.get(dateOnly) ?? {
                date: dateOnly,
                ...defaultDay
              }
            );
          })
        : storedDays
    };
  }

  private generatePeriodDates(period: Period) {
    return period.type === AvailabilityPeriodType.MONTHLY
      ? generateMonthDays(period.monthStartDate ?? period.startDate)
      : generateWeekDays(period.weekStartDate ?? period.startDate);
  }

  private getDefaultAvailabilityDay(user: AuthUser): DefaultAvailabilityDay {
    if (
      user.employeeSubRole === EmployeeSubRole.MANAGER ||
      user.workerType === WorkerType.FULL_TIME
    ) {
      return {
        type: AvailabilityDayType.WORK,
        workPreference: WorkPreference.ANYTIME,
        startTime: null,
        endTime: null,
        note: ""
      };
    }

    return this.getRestDayDefault();
  }

  private getRestDayDefault(): DefaultAvailabilityDay {
    return {
      type: AvailabilityDayType.OFF,
      workPreference: null,
      startTime: null,
      endTime: null,
      note: ""
    };
  }

  private toPeriodResponse(period: Period) {
    return {
      type: period.type,
      startDate: toDateOnly(period.startDate),
      endDate: toDateOnly(period.endDate)
    };
  }
}
