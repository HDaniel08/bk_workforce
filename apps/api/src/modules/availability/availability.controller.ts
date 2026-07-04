import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EmployeeSubRole, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/types/auth-user.type";
import { AvailabilityService } from "./availability.service";
import {
  MyAvailabilityQueryDto,
  TeamAvailabilityQueryDto
} from "./dto/availability-query.dto";
import { SaveAvailabilityDto } from "./dto/save-availability.dto";
import { UpdateTeamAvailabilityDayDto } from "./dto/update-team-availability-day.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get("me")
  @Roles(UserRole.EMPLOYEE)
  getMe(@CurrentUser() user: AuthUser, @Query() query: MyAvailabilityQueryDto) {
    return this.availabilityService.getMe(user, query);
  }

  @Get("open-submission-weeks")
  @Roles(EmployeeSubRole.WORKER)
  getOpenSubmissionWeeks(@CurrentUser() user: AuthUser) {
    return this.availabilityService.getOpenSubmissionWeeks(user);
  }

  @Post("me/save-draft")
  @Roles(UserRole.EMPLOYEE)
  saveDraft(@CurrentUser() user: AuthUser, @Body() dto: SaveAvailabilityDto) {
    return this.availabilityService.saveMe(user, dto, false);
  }

  @Post("me/submit")
  @Roles(UserRole.EMPLOYEE)
  submit(@CurrentUser() user: AuthUser, @Body() dto: SaveAvailabilityDto) {
    return this.availabilityService.saveMe(user, dto, true);
  }

  @Get("team")
  @Roles(UserRole.ADMIN, EmployeeSubRole.MANAGER)
  getTeam(@CurrentUser() user: AuthUser, @Query() query: TeamAvailabilityQueryDto) {
    return this.availabilityService.getTeam(user, query);
  }

  @Post("team/:userId/day")
  @Roles(EmployeeSubRole.MANAGER)
  updateTeamDay(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
    @Body() dto: UpdateTeamAvailabilityDayDto
  ) {
    return this.availabilityService.updateTeamDay(user, userId, dto);
  }

  @Get("submission-week")
  @Roles(EmployeeSubRole.MANAGER)
  getSubmissionWeek(
    @CurrentUser() user: AuthUser,
    @Query("weekStartDate") weekStartDate: string
  ) {
    return this.availabilityService.getSubmissionWeek(user, weekStartDate);
  }

  @Post("submission-week/open")
  @Roles(EmployeeSubRole.MANAGER)
  openSubmissionWeek(
    @CurrentUser() user: AuthUser,
    @Body("weekStartDate") weekStartDate: string
  ) {
    return this.availabilityService.openSubmissionWeek(user, weekStartDate);
  }

  @Post("submission-week/close")
  @Roles(EmployeeSubRole.MANAGER)
  closeSubmissionWeek(
    @CurrentUser() user: AuthUser,
    @Body("weekStartDate") weekStartDate: string
  ) {
    return this.availabilityService.closeSubmissionWeek(user, weekStartDate);
  }

  @Get("required-missing")
  @Roles(EmployeeSubRole.MANAGER)
  getRequiredMissing(
    @CurrentUser() user: AuthUser,
    @Query("weekStartDate") weekStartDate: string
  ) {
    return this.availabilityService.getRequiredMissing(user, weekStartDate);
  }
}
