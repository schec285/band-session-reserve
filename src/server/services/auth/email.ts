/**
 * 認証メール送信ユーティリティ。
 * TODO: 実際のメール送信サービス（Resend等）に差し替える
 */

/**
 * メールアドレス確認用の認証コードを送信する。
 * ユーザー登録後に呼び出し、アカウント有効化フローで使用する。
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  console.log(`[mock] sendVerificationEmail to=${email} code=${code}`);
}

/**
 * パスワードリセット用の認証コードを送信する。
 * パスワードリセット申請後に呼び出す。
 */
export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  console.log(`[mock] sendPasswordResetEmail to=${email} code=${code}`);
}
