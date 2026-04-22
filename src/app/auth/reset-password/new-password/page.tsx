import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

/**
 * 新パスワード設定ページ。
 * クッキーの有無チェックは proxy.ts が担い、このページは常にフォームを描画する。
 */
export default function NewPasswordPage() {
  return <ResetPasswordForm />;
}
