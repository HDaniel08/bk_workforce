import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EmployeeSubRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/types/auth-user.type";
import { CreateHandoverPostDto } from "./dto/create-handover-post.dto";
import { HandoverContentDto } from "./dto/handover-content.dto";
import { HandoverDayQueryDto } from "./dto/handover-day-query.dto";
import { HandoverSearchQueryDto } from "./dto/handover-search-query.dto";
import { HandoversService } from "./handovers.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeSubRole.MANAGER)
@Controller("handovers")
export class HandoversController {
  constructor(private readonly handoversService: HandoversService) {}

  @Get("day")
  getDay(@CurrentUser() user: AuthUser, @Query() query: HandoverDayQueryDto) {
    return this.handoversService.getDay(user, query.date);
  }

  @Get("search")
  search(@CurrentUser() user: AuthUser, @Query() query: HandoverSearchQueryDto) {
    return this.handoversService.search(user, query);
  }

  @Get("managers")
  getManagers(@CurrentUser() user: AuthUser) {
    return this.handoversService.getManagers(user);
  }

  @Get("tags")
  getTags(@CurrentUser() user: AuthUser) {
    return this.handoversService.getTags(user);
  }

  @Post("posts")
  createPost(@CurrentUser() user: AuthUser, @Body() dto: CreateHandoverPostDto) {
    return this.handoversService.createPost(user, dto);
  }

  @Patch("posts/:id")
  updatePost(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: HandoverContentDto) {
    return this.handoversService.updatePost(user, id, dto);
  }

  @Delete("posts/:id")
  deletePost(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.handoversService.deletePost(user, id);
  }

  @Post("posts/:id/replies")
  createReply(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: HandoverContentDto) {
    return this.handoversService.createReply(user, id, dto);
  }

  @Patch("replies/:id")
  updateReply(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: HandoverContentDto) {
    return this.handoversService.updateReply(user, id, dto);
  }

  @Delete("replies/:id")
  deleteReply(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.handoversService.deleteReply(user, id);
  }
}

