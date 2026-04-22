import { cookies } from "next/headers";
import { ResetPasswordRequestForm } from "@/features/auth/ResetPasswordRequestForm";
import type { ToastVariant } from "@/components/ui/Toast";

/**
 * パスワードリセットリクエストページ。
 * フラッシュクッキーが存在する場合はトースト表示のため ResetPasswordRequestForm に渡す。
 */
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const flashRaw = cookieStore.get("flash")?.value;
  const flash = flashRaw
    ? (JSON.parse(flashRaw) as { type: ToastVariant; message: string })
    : null;

  return <ResetPasswordRequestForm flash={flash} />;
}
