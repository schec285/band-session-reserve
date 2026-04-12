import type { Resend } from "resend";
import type { IEmailService } from "./email-service";
import { buildHtml } from "../html";

/**
 * Resend を使ったメール送信サービスの実装。
 */
export class ResendEmailService implements IEmailService {
  constructor(private readonly resend: Resend) { }

  /**
   * 共通フィールド（from・headers）を付与してメールを送信する。
   */
  private async send(params: { to: string; subject: string; html: string }): Promise<{ status: "ok" } | { status: "error" }> {
    const { data, error } = await this.resend.emails.send({
      from: "onboarding@resend.dev",
      to: params.to,
      subject: params.subject,
      html: params.html,
      headers: { "Content-Language": "ja" },
    });

    if (error || !data) return { status: "error" };
    return { status: "ok" };
  }

  /**
   * メール認証コードを含む確認メールを送信する。
   */
  async sendVerificationEmail(params: {
    to: string;
    name: string;
    code: string;
  }): Promise<{ status: "ok" } | { status: "error" }> {
    return this.send({
      to: params.to,
      subject: "メールアドレスの確認",
      html: buildHtml(`<p>${params.name} さん。<br>認証コードは <strong>${params.code}</strong> です。10分以内に入力してください。</p>`),
    });
  }

  /**
   * ユーザー登録完了のウェルカムメールを送信する。
   */
  async sendWelcomeEmail(params: {
    to: string;
    name: string;
  }): Promise<{ status: "ok" } | { status: "error" }> {
    return this.send({
      to: params.to,
      subject: "OTONOWAへようこそ",
      html: buildHtml(`<p>${params.name} さん。<br>メール認証が完了しました。ご登録ありがとうございます。</p>`),
    });
  }
}
