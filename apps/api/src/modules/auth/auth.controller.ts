import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthUser } from "./types/auth-user.type";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() loginDto: LoginDto) {
    return this.authService.loginEmployee(loginDto);
  }

  @Post("superadmin/login")
  superadminLogin(@Body() loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  @Post("forgot-password")
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post("reset-password")
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }
}
