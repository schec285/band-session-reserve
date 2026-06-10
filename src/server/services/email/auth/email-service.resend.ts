import type { Resend } from "resend";
import type { IEmailService } from "./email-service";
import { buildHtml } from "../html";
import { APP_NAME } from "@/lib/constants/app";

/**
 * Resend を使ったメール送信サービスの実装。
 */
export class ResendEmailService implements IEmailService {
  constructor(private readonly resend: Resend) { }

  /**
   * 共通フィールド（from・headers）を付与してメールを送信する。
   */
  private async send(params: { to: string; subject: string; html: string }): Promise<{ status: "ok" } | { status: "error" }> {
    if (!process.env.RESEND_FROM_EMAIL) throw new Error("RESEND_FROM_EMAIL environment variable is not set");

    const { data, error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
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
      subject: `【${APP_NAME}】メールアドレス確認のご案内`,
      html: buildHtml(`
        <p>
          ${params.name} さん。<br>
          <br>
          ${APP_NAME}へのご登録ありがとうございます。<br>
          メールアドレス確認のため、以下の認証コードを入力してください。<br>
          認証コードは <strong>${params.code}</strong> です。<br>
          有効期限は10分です。<br>
          <br>
          万一メールに心当たりがない場合は無視してください。<br>
          <br>
          ※このメールは送信専用です。返信してもお答えできませんのでご了承ください。
        </p>
      `),
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
      subject: `【${APP_NAME}】${APP_NAME}へようこそ`,
      html: buildHtml(`
        <p>
          ${params.name} さん。<br>
          <br>
          ${APP_NAME}へのご登録ありがとうございます。<br>
          メールアドレスの確認が完了しました。<br>
          イベントへの参加予約は、以下のページからご利用いただけます。<br>
          <a href="${process.env.APP_BASE_URL}">${process.env.APP_BASE_URL}</a><br>
          <br>
          引き続き${APP_NAME}をよろしくお願いいたします。<br>
          <br>
          ※このメールは送信専用です。返信してもお答えできませんのでご了承ください。
        </p>
      `),
    });
  }

  /**
   * パスワードリセット用の認証コードメールを送信する。
   */
  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    code: string;
  }): Promise<{ status: "ok" } | { status: "error" }> {
    return this.send({
      to: params.to,
      subject: `【${APP_NAME}】パスワードリセットのご案内`,
      html: buildHtml(`
        <p>
          ${params.name} さん。<br>
          <br>
          パスワードリセットのため、以下の認証コードを入力してください。<br>
          認証コードは <strong>${params.code}</strong> です。<br>
          有効期限は10分です。<br>
          <br>
          万一このメールに心当たりがない場合は無視してください。<br>
          <br>
          ※このメールは送信専用です。返信してもお答えできませんのでご了承ください。
        </p>
      `),
    });
  }
}
