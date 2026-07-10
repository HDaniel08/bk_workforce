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

interface EmailAction {
  label: string;
  url: string;
}

interface EmailDetail {
  label: string;
  value: string;
}

interface BrandedEmailParams {
  title: string;
  eyebrow?: string;
  greeting?: string;
  intro: string[];
  details?: EmailDetail[];
  action?: EmailAction;
  outro?: string[];
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
        this.renderBrandedEmail({
          title: "Fiok letrehozva",
          eyebrow: "BK Workforce",
          greeting: `Szia ${params.firstName}!`,
          intro: ["Letrehoztuk a BK Workforce fiokodat."],
          details: [
            { label: "Bejelentkezesi email", value: params.email },
            { label: "Ideiglenes jelszo", value: params.temporaryPassword }
          ],
          action: {
            label: "Bejelentkezes",
            url: params.loginUrl
          },
          outro: ["Az elso belepes utan kotelezo uj jelszot megadni."]
        })
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
      html: this.renderBrandedEmail({
        title: "Jelszo visszaallitasa",
        eyebrow: "BK Workforce",
        greeting: `Szia ${params.firstName}!`,
        intro: [
          "Jelszo-visszaallitast kertel a BK Workforce fiokodhoz.",
          "A link 30 percig ervenyes."
        ],
        action: {
          label: "Uj jelszo beallitasa",
          url: params.resetUrl
        },
        outro: ["Ha nem te kerted, hagyd figyelmen kivul ezt az emailt."]
      })
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
      html: this.renderBrandedEmail({
        title: subject,
        eyebrow: "Teszt email",
        intro: message.split("\n").filter((line) => line.trim().length > 0)
      })
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private renderBrandedEmail(params: BrandedEmailParams) {
    const intro = params.intro
      .map(
        (line) =>
          `<p style="margin:0 0 14px;color:#502314;font-size:15px;line-height:1.6;">${this.escapeHtml(line)}</p>`
      )
      .join("");
    const outro = (params.outro ?? [])
      .map(
        (line) =>
          `<p style="margin:14px 0 0;color:#6f4a3b;font-size:13px;line-height:1.6;">${this.escapeHtml(line)}</p>`
      )
      .join("");
    const details = params.details?.length
      ? [
          '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:separate;border-spacing:0;border:1px solid rgba(80,35,20,0.12);border-radius:8px;overflow:hidden;">',
          ...params.details.map(
            (detail) => `
              <tr>
                <td style="padding:12px 14px;border-bottom:1px solid rgba(80,35,20,0.10);background:#F5EBDC;color:#6f4a3b;font-size:12px;font-weight:700;text-transform:uppercase;">${this.escapeHtml(detail.label)}</td>
                <td style="padding:12px 14px;border-bottom:1px solid rgba(80,35,20,0.10);background:#ffffff;color:#502314;font-size:14px;font-weight:700;">${this.escapeHtml(detail.value)}</td>
              </tr>`
          ),
          "</table>"
        ].join("")
      : "";
    const action = params.action
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 4px;">
          <tr>
            <td style="border-radius:6px;background:#D72300;">
              <a href="${this.escapeHtml(params.action.url)}" style="display:inline-block;padding:12px 18px;color:#F5EBDC;font-size:14px;font-weight:700;text-decoration:none;">${this.escapeHtml(params.action.label)}</a>
            </td>
          </tr>
        </table>`
      : "";

    return `
      <!doctype html>
      <html lang="hu">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${this.escapeHtml(params.title)}</title>
        </head>
        <body style="margin:0;padding:0;background:#F5EBDC;color:#502314;font-family:Inter,Segoe UI,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5EBDC;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <div style="color:#D72300;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">BK Workforce</div>
                      <div style="margin-top:4px;color:#502314;font-size:20px;font-weight:800;">Munkaero kezelo</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px;border-radius:8px;background:#ffffff;box-shadow:0 18px 45px rgba(80,35,20,0.12);">
                      ${
                        params.eyebrow
                          ? `<div style="margin:0 0 8px;color:#D72300;font-size:12px;font-weight:800;text-transform:uppercase;">${this.escapeHtml(params.eyebrow)}</div>`
                          : ""
                      }
                      <h1 style="margin:0 0 18px;color:#502314;font-size:24px;line-height:1.25;">${this.escapeHtml(params.title)}</h1>
                      ${
                        params.greeting
                          ? `<p style="margin:0 0 14px;color:#502314;font-size:15px;font-weight:700;line-height:1.6;">${this.escapeHtml(params.greeting)}</p>`
                          : ""
                      }
                      ${intro}
                      ${details}
                      ${action}
                      ${outro}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 2px 0;color:#6f4a3b;font-size:12px;line-height:1.5;">
                      Ez egy automatikus email a BK Workforce rendszerbol.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`;
  }
}
