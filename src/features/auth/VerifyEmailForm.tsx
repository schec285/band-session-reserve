"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * メールアドレス認証コード入力フォーム。
 * サーバーが発行した HMAC クッキーを利用して認証を行う。
 * 成功後はサインインページへリダイレクトする。
 * 認証コードの再送機能を備え、再送後は60秒のクールダウンを設ける。
 */
export function VerifyEmailForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

  async function handleResend() {
    setResendLoading(true);
    setResendError(null);

    const res = await fetch("/api/auth/resend-verification", { method: "POST" });

    setResendLoading(false);

    if (!res.ok) {
      const json = await res.json();
      if (json.reason === "restart" || json.reason === "expired") {
        router.push("/auth/signup");
        return;
      }
      setResendError(json.message ?? "再送に失敗しました");
      return;
    }

    setResendCooldown(60);
  }

  const resendDisabled = resendCooldown > 0 || resendLoading || loading;
  const resendLabel = resendLoading
    ? "送信中..."
    : resendCooldown > 0
      ? `再送まで ${resendCooldown}秒`
      : "認証コードを再送";

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
        <div className="mt-3 space-y-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendDisabled}
            onClick={handleResend}
          >
            {resendLabel}
          </Button>
          {resendError && (
            <p className="text-sm text-destructive">{resendError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
