"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/Toast";
import type { ToastVariant } from "@/components/ui/Toast";
import { clearFlash } from "@/server/actions/flash";

interface SignInFormProps {
  flash?: { type: ToastVariant; message: string } | null;
}

/**
 * メール/パスワードによるサインインフォーム。
 * callbackUrl クエリパラメータが存在する場合はサインイン成功後にそのURLへリダイレクトする。
 * 存在しない場合はトップページへリダイレクトする。
 * flash が渡された場合はトースト通知を表示してクッキーを削除する。
 */
export function SignInForm({ flash }: SignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(flash ?? null);

  useEffect(() => {
    if (flash) clearFlash();
  }, []);

  /**
   * メール/パスワードでサインインする。
   * 失敗時はエラーメッセージを表示し、成功時は callbackUrl（なければトップページ）へ遷移する。
   */
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/";
    startTransition(() => {
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>サインイン</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || isPending}>
            {loading || isPending ? "サインイン中..." : "サインイン"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/reset-password" className="underline">
              パスワードをお忘れの方
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{" "}
            <Link href="/auth/signup" className="underline">
              新規登録
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
    </>
  );
}
