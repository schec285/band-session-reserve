type SendEmailResult = { status: "ok" } | { status: "error" };

/**
 * メール送信サービスのインターフェース。
 * プロバイダーに依存しない抽象を提供する。
 */
export interface IEmailService {
  /**
   * メール認証コードを含む確認メールを送信する。
   */
  sendVerificationEmail(params: {
    to: string;
    name: string;
    code: string;
  }): Promise<SendEmailResult>;

  /**
   * ユーザー登録完了のウェルカムメールを送信する。
   */
  sendWelcomeEmail(params: {
    to: string;
    name: string;
  }): Promise<SendEmailResult>;

  /**
   * パスワードリセット用の認証コードメールを送信する。
   */
  sendPasswordResetEmail(params: {
    to: string;
    name: string;
    code: string;
  }): Promise<SendEmailResult>;
}
