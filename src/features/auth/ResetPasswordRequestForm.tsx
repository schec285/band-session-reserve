"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/Toast";
import type { ToastVariant } from "@/components/ui/Toast";
import { clearFlash } from "@/server/actions/flash";

interface ResetPasswordRequestFormProps {
  flash?: { type: ToastVariant; message: string } | null;
}

/**
 * パスワードリセットリクエストフォーム。
 * メールアドレスを入力して送信すると認証コード入力ページへ遷移する。
 * flash が渡された場合はトースト通知を表示してクッキーを削除する。
 */
export function ResetPasswordRequestForm({ flash }: ResetPasswordRequestFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

    const res = await fetch("/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const json = await res.json();
      setLoading(false);
      setError(json.message ?? "送信に失敗しました");
      return;
    }

    router.push("/auth/reset-password/verify");
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
          <CardTitle>パスワードリセット</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              登録済みのメールアドレスを入力してください。認証コードを送信します。
            </p>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "送信中..." : "認証コードを送信"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/auth/signin" className="underline">
                サインインに戻る
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
