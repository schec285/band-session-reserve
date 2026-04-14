"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * メールアドレス認証コード入力フォーム。
 * サーバーが発行した HMAC クッキーを利用して認証を行う。
 * 成功後はサインインページへリダイレクトする。
 */
export function VerifyEmailForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.reason === "restart" || json.reason === "expired") {
        router.push("/auth/signup");
        return;
      }
      setLoading(false);
      setError(json.message ?? "認証に失敗しました");
      return;
    }

    router.push("/auth/signin");
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>メールアドレスの確認</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            登録いただいたメールアドレスに6桁の認証コードを送信しました。
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="code">認証コード</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              required
              autoComplete="one-time-code"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "確認中..." : "確認する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
