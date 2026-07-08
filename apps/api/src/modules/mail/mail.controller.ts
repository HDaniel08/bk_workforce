import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { EmployeeSubRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SendTestEmailDto } from "./dto/send-test-email.dto";
import { MailService } from "./mail.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeSubRole.MANAGER)
@Controller("mail")
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post("test")
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    await this.mailService.sendTestEmail({
      to: dto.to,
      subject: dto.subject,
      message: dto.message
    });

    return { success: true };
  }
}
