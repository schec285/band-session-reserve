"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/Toast";
import type { ToastVariant } from "@/components/ui/Toast";
import { PasswordPolicyChecklist } from "@/components/ui/PasswordPolicyChecklist";
import { clearFlash } from "@/server/actions/flash";
import { isPasswordPolicySatisfied } from "@/lib/utils/password";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

interface SignUpFormProps {
  flash?: { type: ToastVariant; message: string } | null;
}

/**
 * ユーザー登録フォーム。
 * 登録成功後はメールアドレス認証ページへリダイレクトする。
 * flash が渡された場合はトースト通知を表示してクッキーを削除する。
 */
export function SignUpForm({ flash }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(flash ?? null);

  useEffect(() => {
    if (flash) clearFlash();
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      setLoading(false);
      return;
    }

    const res = await fetchWithCsrf("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    if (!res.ok) {
      const json = await res.json();
      setLoading(false);
      setError(json.message ?? "登録に失敗しました");
      return;
    }

    router.push("/auth/signup/verify");
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
        <CardTitle>新規登録</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="name">ハンドルネーム</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              autoComplete="new-password"
            />
            <PasswordPolicyChecklist password={password} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !isPasswordPolicySatisfied(password)}>
            {loading ? "登録中..." : "登録する"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            すでにアカウントをお持ちの方は{" "}
            <a href="/auth/signin" className="underline">
              サインイン
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
    </>
  );
}
