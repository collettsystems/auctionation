import nodemailer, { type Transporter } from "nodemailer";

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  defaultFrom: string;
}

export interface EmailMessage {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  provider: "smtp";
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  public constructor(private readonly config: SmtpEmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.username
        ? {
            user: config.username,
            pass: config.password ?? ""
          }
        : undefined
    });
  }

  public async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const result = await this.transporter.sendMail({
      to: message.to,
      from: message.from ?? this.config.defaultFrom,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo
    });

    return {
      provider: "smtp",
      messageId: result.messageId,
      accepted: result.accepted.map(String),
      rejected: result.rejected.map(String)
    };
  }
}

export function createSmtpEmailProvider(config: SmtpEmailConfig): EmailProvider {
  return new SmtpEmailProvider(config);
}