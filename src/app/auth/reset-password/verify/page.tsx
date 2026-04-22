import { VerifyCodeForm } from "@/features/auth/VerifyCodeForm";

/**
 * パスワードリセット コード入力ページ。
 * クッキーの有無チェックは proxy.ts が担い、このページは常にフォームを描画する。
 */
export default function ResetPasswordVerifyPage() {
  return (
    <VerifyCodeForm
      verifyEndpoint="/api/auth/reset-password/verify"
      resendEndpoint="/api/auth/reset-password/resend"
      restartPath="/auth/reset-password"
      successPath="/auth/reset-password/new-password"
      title="パスワードリセットの確認"
      description="登録済みのメールアドレスに6桁の認証コードを送信しました。"
    />
  );
}
