"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * パートの予約ボタン。
 * 未認証の場合はサインインページへリダイレクトする。
 * 予約成功後はページを再読み込みして最新の予約状況を反映する。
 */
export function ReserveButton({
  eventSongId,
  part,
}: {
  eventSongId: string;
  part: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReserve() {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventSongId, part, snsConsent: true }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.message ?? "予約に失敗しました");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={handleReserve} disabled={loading}>
        {loading ? "予約中..." : "予約する"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
