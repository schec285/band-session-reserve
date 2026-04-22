import { VerifyCodeForm } from "@/features/auth/VerifyCodeForm";

/**
 * メールアドレス認証ページ。
 * クッキーの有無チェックは proxy.ts が担い、このページは常にフォームを描画する。
 */
export default function VerifyEmailPage() {
  return (
    <VerifyCodeForm
      verifyEndpoint="/api/auth/verify-email"
      resendEndpoint="/api/auth/resend-verification"
      restartPath="/auth/signup"
      successPath="/auth/signin"
      title="メールアドレスの確認"
      description="登録いただいたメールアドレスに6桁の認証コードを送信しました。"
    />
  );
}
