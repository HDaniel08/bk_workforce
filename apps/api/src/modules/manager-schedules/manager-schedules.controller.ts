import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EmployeeSubRole, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/types/auth-user.type";
import { CollisionRangeDto, DayQueryDto, ManagerRequestDto, MonthQueryDto, MonthTargetsDto, OwnerDto, ScheduleDayDto } from "./manager-schedules.dto";
import { ManagerSchedulesService } from "./manager-schedules.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("manager-schedules")
export class ManagerSchedulesController {
  constructor(private readonly service: ManagerSchedulesService) {}

  @Get("profile")
  @Roles(EmployeeSubRole.MANAGER)
  profile(@CurrentUser() actor: AuthUser) { return this.service.profile(actor); }

  @Patch("owner")
  @Roles(EmployeeSubRole.MANAGER)
  transfer(@CurrentUser() actor: AuthUser, @Body() dto: OwnerDto) {
    return this.service.assignOwner(actor, actor.tenantId, dto.userId);
  }

  @Patch("tenants/:tenantId/owner")
  @Roles(UserRole.ADMIN)
  assign(@CurrentUser() actor: AuthUser, @Param("tenantId") tenantId: string, @Body() dto: OwnerDto) {
    return this.service.assignOwner(actor, tenantId, dto.userId);
  }

  @Get("collision")
  @Roles(EmployeeSubRole.MANAGER)
  collision(@CurrentUser() actor: AuthUser, @Query() query: DayQueryDto) {
    return this.service.collision(actor, query.date);
  }

  @Get("collision-range")
  @Roles(EmployeeSubRole.MANAGER)
  collisionRange(@CurrentUser() actor: AuthUser, @Query() query: CollisionRangeDto) {
    return this.service.collisionRange(actor, query.from, query.to);
  }

  @Get("requests/me")
  @Roles(EmployeeSubRole.MANAGER)
  myRequests(@CurrentUser() actor: AuthUser, @Query() query: MonthQueryDto) {
    return this.service.myRequests(actor, query.month);
  }

  @Post("requests/me")
  @Roles(EmployeeSubRole.MANAGER)
  saveRequest(@CurrentUser() actor: AuthUser, @Body() dto: ManagerRequestDto) {
    return this.service.saveRequest(actor, dto);
  }

  @Delete("requests/me/:date")
  @Roles(EmployeeSubRole.MANAGER)
  removeRequest(@CurrentUser() actor: AuthUser, @Param("date") date: string) {
    return this.service.removeRequest(actor, date);
  }

  @Get("months/:month")
  @Roles(EmployeeSubRole.MANAGER, "STAND_IN_MANAGER")
  getMonth(@CurrentUser() actor: AuthUser, @Param("month") month: string) {
    return this.service.getMonth(actor, month);
  }

  @Get("weeks/:weekStart")
  @Roles(EmployeeSubRole.MANAGER, "STAND_IN_MANAGER")
  getWeek(@CurrentUser() actor: AuthUser, @Param("weekStart") weekStart: string) {
    return this.service.getWeek(actor, weekStart);
  }

  @Patch("months/:month/targets")
  @Roles(EmployeeSubRole.MANAGER)
  setTargets(@CurrentUser() actor: AuthUser, @Param("month") month: string, @Body() dto: MonthTargetsDto) {
    return this.service.setTargets(actor, month, dto);
  }

  @Patch("months/:month/day")
  @Roles(EmployeeSubRole.MANAGER)
  setDay(@CurrentUser() actor: AuthUser, @Param("month") month: string, @Body() dto: ScheduleDayDto) {
    return this.service.setDay(actor, month, dto);
  }

  @Post("months/:month/publish")
  @Roles(EmployeeSubRole.MANAGER)
  publish(@CurrentUser() actor: AuthUser, @Param("month") month: string) {
    return this.service.setStatus(actor, month, "PUBLISHED");
  }

  @Post("months/:month/reopen")
  @Roles(EmployeeSubRole.MANAGER)
  reopen(@CurrentUser() actor: AuthUser, @Param("month") month: string) {
    return this.service.setStatus(actor, month, "DRAFT");
  }
}
