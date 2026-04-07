"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * パートの予約ボタン。
 * API が 401 を返した場合は現在 URL を callbackUrl として付与したうえでサインインページへリダイレクトする。
 * 予約成功後はページを再読み込みして最新の予約状況を反映する。
 */
export function ReserveButton({
  eventSongId,
  part,
}: {
  eventSongId: string;
  part: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReserve() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventSongId, part, snsConsent: true }),
    });

    setLoading(false);

    if (res.status === 401) {
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }

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
