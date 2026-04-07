import { Suspense } from "react";
import { SignInForm } from "@/features/auth/SignInForm";

/**
 * サインインページ。
 * useSearchParams を使用するため SignInForm を Suspense でラップする。
 */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
