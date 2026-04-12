import { cookies } from "next/headers";
import { SignUpForm } from "@/features/auth/SignUpForm";
import type { ToastVariant } from "@/components/ui/Toast";

/**
 * サインアップページ。
 * フラッシュクッキーが存在する場合はトースト表示のため SignUpForm に渡す。
 */
export default async function SignUpPage() {
  const cookieStore = await cookies();
  const flashRaw = cookieStore.get("flash")?.value;
  const flash = flashRaw
    ? (JSON.parse(flashRaw) as { type: ToastVariant; message: string })
    : null;

  return <SignUpForm flash={flash} />;
}
