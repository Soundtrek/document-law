/// <reference path="./smtp-mailer.d.ts" />
import nodemailer from "smtp-mailer";

export interface MailMessage { to: string; subject: string; text: string }
export interface MailProvider { send(message: MailMessage): Promise<void> }

export class SMTPMailProvider implements MailProvider {
  private readonly transport;
  constructor(private readonly config: { host: string; port: number; secure: boolean; from: string; user?: string; password?: string }) {
    this.transport = nodemailer.createTransport({
      host: config.host, port: config.port, secure: config.secure,
      ...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    });
  }
  async send(message: MailMessage): Promise<void> {
    try {
      const result = await this.transport.sendMail({
        from: { address: this.config.from, name: "SAMMA" },
        to: { address: message.to, name: "" }, subject: message.subject, text: message.text,
      });
      if (!result.accepted.length || result.rejected.length) throw new Error("Delivery rejected");
    } catch { throw new Error("Mail delivery unavailable"); }
  }
}

export function configuredMailProvider(env: NodeJS.ProcessEnv = process.env): MailProvider {
  const port = Number(env.SAMMA_SMTP_PORT);
  if (env.SAMMA_MAIL_DRIVER !== "smtp" || !env.SAMMA_SMTP_HOST ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      !["true", "false"].includes(env.SAMMA_SMTP_SECURE ?? "") ||
      !env.SAMMA_MAIL_FROM || /[\r\n]/.test(env.SAMMA_MAIL_FROM)) throw new Error("Mail is not configured");
  return new SMTPMailProvider({ host: env.SAMMA_SMTP_HOST, port, secure: env.SAMMA_SMTP_SECURE === "true",
    from: env.SAMMA_MAIL_FROM, ...(env.SAMMA_SMTP_USER ? { user: env.SAMMA_SMTP_USER, password: env.SAMMA_SMTP_PASSWORD ?? "" } : {}) });
}
