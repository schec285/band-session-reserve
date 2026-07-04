"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordPolicyChecklist } from "@/components/ui/PasswordPolicyChecklist";
import { isPasswordPolicySatisfied } from "@/lib/utils/password";

/**
 * 新パスワード設定フォーム。
 * パスワードと確認用パスワードを入力して送信するとサインインページへ遷移する。
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });

    if (!res.ok) {
      const json = await res.json();
      setLoading(false);
      setError(json.message ?? "パスワードの変更に失敗しました");
      return;
    }

    router.push("/auth/signin");
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>新しいパスワードを設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="password">新しいパスワード</Label>
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
            {loading ? "変更中..." : "パスワードを変更"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
