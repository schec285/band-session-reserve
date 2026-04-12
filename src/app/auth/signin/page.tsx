import { Suspense } from "react";
import { cookies } from "next/headers";
import { SignInForm } from "@/features/auth/SignInForm";
import type { ToastVariant } from "@/components/ui/Toast";

/**
 * サインインページ。
 * フラッシュクッキーが存在する場合はトースト表示のため SignInForm に渡す。
 * useSearchParams を使用するため SignInForm を Suspense でラップする。
 */
export default async function SignInPage() {
  const cookieStore = await cookies();
  const flashRaw = cookieStore.get("flash")?.value;
  const flash = flashRaw
    ? (JSON.parse(flashRaw) as { type: ToastVariant; message: string })
    : null;

  return (
    <Suspense>
      <SignInForm flash={flash} />
    </Suspense>
  );
}
