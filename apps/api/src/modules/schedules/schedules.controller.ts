import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { EmployeeSubRole, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/types/auth-user.type";
import { AssignShiftDto } from "./dto/assign-shift.dto";
import { CreateScheduleWeekDto } from "./dto/create-schedule-week.dto";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { SchedulesService } from "./schedules.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("schedules")
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get("weeks")
  @Roles(UserRole.ADMIN, EmployeeSubRole.MANAGER)
  getWeeks(
    @CurrentUser() user: AuthUser,
    @Query("weekStartDate") weekStartDate?: string,
    @Query("tenantId") tenantId?: string
  ) {
    return this.schedulesService.getWeeks(user, { weekStartDate, tenantId });
  }

  @Post("weeks")
  @Roles(EmployeeSubRole.MANAGER)
  createWeek(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleWeekDto) {
    return this.schedulesService.createWeek(user, dto);
  }

  @Get("weeks/:id")
  @Roles(UserRole.ADMIN, EmployeeSubRole.MANAGER)
  getWeek(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedulesService.getWeek(user, id);
  }

  @Post("weeks/:id/shifts")
  @Roles(EmployeeSubRole.MANAGER)
  createShift(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateShiftDto
  ) {
    return this.schedulesService.createShift(user, id, dto);
  }

  @Patch("shifts/:shiftId")
  @Roles(EmployeeSubRole.MANAGER)
  updateShift(
    @CurrentUser() user: AuthUser,
    @Param("shiftId") shiftId: string,
    @Body() dto: UpdateShiftDto
  ) {
    return this.schedulesService.updateShift(user, shiftId, dto);
  }

  @Delete("shifts/:shiftId")
  @Roles(EmployeeSubRole.MANAGER)
  deleteShift(@CurrentUser() user: AuthUser, @Param("shiftId") shiftId: string) {
    return this.schedulesService.deleteShift(user, shiftId);
  }

  @Post("shifts/:shiftId/assign")
  @Roles(EmployeeSubRole.MANAGER)
  assignShift(
    @CurrentUser() user: AuthUser,
    @Param("shiftId") shiftId: string,
    @Body() dto: AssignShiftDto
  ) {
    return this.schedulesService.assignShift(user, shiftId, dto);
  }

  @Delete("assignments/:assignmentId")
  @Roles(EmployeeSubRole.MANAGER)
  unassignShift(
    @CurrentUser() user: AuthUser,
    @Param("assignmentId") assignmentId: string
  ) {
    return this.schedulesService.unassignShift(user, assignmentId);
  }

  @Post("weeks/:id/publish")
  @Roles(EmployeeSubRole.MANAGER)
  publishWeek(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedulesService.publishWeek(user, id);
  }

  @Post("weeks/:id/lock")
  @Roles(EmployeeSubRole.MANAGER)
  lockWeek(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedulesService.lockWeek(user, id);
  }

  @Get("me")
  @Roles(UserRole.EMPLOYEE)
  getMe(@CurrentUser() user: AuthUser, @Query("weekStartDate") weekStartDate?: string) {
    return this.schedulesService.getMe(user, weekStartDate);
  }
}
