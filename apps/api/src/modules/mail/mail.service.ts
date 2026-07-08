import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

interface PasswordResetEmailParams {
  to: string;
  firstName: string;
  resetUrl: string;
}

interface TestEmailParams {
  to: string;
  subject?: string;
  message?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  getLoginUrl() {
    const appUrl = this.configService.get<string>("APP_URL", "http://localhost:5173");
    return `${appUrl.replace(/\/$/, "")}/login`;
  }

  getPasswordResetUrl(token: string) {
    const appUrl = this.configService.get<string>("APP_URL", "http://localhost:5173");
    return `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  }

  sendWelcomeEmail(params: WelcomeEmailParams) {
    return this.sendEmail({
      to: params.to,
      subject: "BK Workforce fiok letrehozva",
      text: [
        `Szia ${params.firstName}!`,
        "",
        "Letrehoztuk a BK Workforce fiokodat.",
        `Bejelentkezesi email: ${params.email}`,
        `Ideiglenes jelszo: ${params.temporaryPassword}`,
        `Bejelentkezes: ${params.loginUrl}`,
        "",
        "Az elso belepes utan kotelezo uj jelszot megadni."
      ].join("\n"),
      html: [
        `<p>Szia ${this.escapeHtml(params.firstName)}!</p>`,
        "<p>Letrehoztuk a BK Workforce fiokodat.</p>",
        "<ul>",
        `<li><strong>Bejelentkezesi email:</strong> ${this.escapeHtml(params.email)}</li>`,
        `<li><strong>Ideiglenes jelszo:</strong> ${this.escapeHtml(params.temporaryPassword)}</li>`,
        "</ul>",
        `<p><a href="${this.escapeHtml(params.loginUrl)}">Bejelentkezes</a></p>`,
        "<p>Az elso belepes utan kotelezo uj jelszot megadni.</p>"
      ].join("")
    });
  }

  sendPasswordResetEmail(params: PasswordResetEmailParams) {
    return this.sendEmail({
      to: params.to,
      subject: "BK Workforce jelszo visszaallitasa",
      text: [
        `Szia ${params.firstName}!`,
        "",
        "Jelszo-visszaallitast kertel a BK Workforce fiokodhoz.",
        "A link 30 percig ervenyes:",
        params.resetUrl,
        "",
        "Ha nem te kerted, hagyd figyelmen kivul ezt az emailt."
      ].join("\n"),
      html: [
        `<p>Szia ${this.escapeHtml(params.firstName)}!</p>`,
        "<p>Jelszo-visszaallitast kertel a BK Workforce fiokodhoz.</p>",
        `<p><a href="${this.escapeHtml(params.resetUrl)}">Uj jelszo beallitasa</a></p>`,
        "<p>A link 30 percig ervenyes.</p>",
        "<p>Ha nem te kerted, hagyd figyelmen kivul ezt az emailt.</p>"
      ].join("")
    });
  }

  sendTestEmail(params: TestEmailParams) {
    const subject = params.subject?.trim() || "BK Workforce teszt email";
    const message =
      params.message?.trim() ||
      "Ez egy teszt email a BK Workforce manager feluleterol.";

    return this.sendEmail({
      to: params.to,
      subject,
      text: message,
      html: `<p>${this.escapeHtml(message).replace(/\n/g, "<br>")}</p>`
    });
  }

  private async sendEmail(params: SendEmailParams) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY")?.trim();
    const from =
      this.configService.get<string>("MAIL_FROM")?.trim() ||
      "BK Workforce <onboarding@resend.dev>";

    if (!apiKey) {
      console.log([
        "",
        "=== BK Workforce email ===",
        `To: ${params.to}`,
        `Subject: ${params.subject}`,
        "",
        params.text,
        "==========================",
        ""
      ].join("\n"));
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend email failed: ${response.status} ${body}`);
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
