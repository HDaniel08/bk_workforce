import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EmployeeSubRole, UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/types/auth-user.type";
import { CreateVacationRequestDto } from "./dto/create-vacation-request.dto";
import { ReviewVacationRequestDto } from "./dto/review-vacation-request.dto";
import { VacationRequestQueryDto } from "./dto/vacation-request-query.dto";
import { VacationRequestsService } from "./vacation-requests.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("vacation-requests")
export class VacationRequestsController {
  constructor(private readonly vacationRequestsService: VacationRequestsService) {}

  @Get("me")
  @Roles(UserRole.EMPLOYEE)
  getMe(@CurrentUser() user: AuthUser, @Query() query: VacationRequestQueryDto) {
    return this.vacationRequestsService.getMe(user, query);
  }

  @Post("me")
  @Roles(UserRole.EMPLOYEE)
  createMe(@CurrentUser() user: AuthUser, @Body() dto: CreateVacationRequestDto) {
    return this.vacationRequestsService.createMe(user, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, EmployeeSubRole.MANAGER)
  getAll(@CurrentUser() user: AuthUser, @Query() query: VacationRequestQueryDto) {
    return this.vacationRequestsService.getAll(user, query);
  }

  @Post(":id/approve")
  @Roles(EmployeeSubRole.MANAGER)
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ReviewVacationRequestDto
  ) {
    return this.vacationRequestsService.approve(user, id, dto);
  }

  @Post(":id/reject")
  @Roles(EmployeeSubRole.MANAGER)
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ReviewVacationRequestDto
  ) {
    return this.vacationRequestsService.reject(user, id, dto);
  }

  @Post(":id/cancel")
  @Roles(UserRole.EMPLOYEE)
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vacationRequestsService.cancel(user, id);
  }
}
