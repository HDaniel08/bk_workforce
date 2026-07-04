import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  getTransportConfig() {
    return {
      host: this.configService.get<string>("MAIL_HOST"),
      port: this.configService.get<number>("MAIL_PORT"),
      user: this.configService.get<string>("MAIL_USER"),
      pass: this.configService.get<string>("MAIL_PASS"),
      from: this.configService.get<string>("MAIL_FROM")
    };
  }

  getLoginUrl() {
    const appUrl = this.configService.get<string>("APP_URL", "http://localhost:5173");
    return `${appUrl.replace(/\/$/, "")}/login`;
  }

  async sendWelcomeEmail(params: WelcomeEmailParams) {
    const transport = this.getTransportConfig();

    if (!transport.host || !transport.port || !transport.user || !transport.pass) {
      console.log([
        "",
        "=== BK Workforce welcome email ===",
        `To: ${params.to}`,
        `Hello ${params.firstName},`,
        "",
        "Your BK Workforce account has been created.",
        `Login email: ${params.email}`,
        `Temporary password: ${params.temporaryPassword}`,
        `Login URL: ${params.loginUrl}`,
        "",
        "You must change your password on first login.",
        "==================================",
        ""
      ].join("\n"));
      return;
    }

    console.log(
      `SMTP is configured for ${transport.host}. Email adapter is not wired yet; welcome email for ${params.to} was not sent.`
    );
  }
}
