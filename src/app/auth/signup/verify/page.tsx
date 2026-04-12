import { VerifyEmailForm } from "@/features/auth/VerifyEmailForm";

/**
 * メールアドレス認証ページ。
 * クッキーの有無チェックは proxy.ts が担い、このページは常にフォームを描画する。
 */
export default function VerifyEmailPage() {
  return <VerifyEmailForm />;
}
