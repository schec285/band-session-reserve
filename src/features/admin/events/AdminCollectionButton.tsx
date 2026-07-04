"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

type Props = {
  eventId: string;
  userId: string;
  collected: boolean;
};

/**
 * 参加費の徴収状況をトグルするボタン。
 * 押下で PATCH API を呼び出し、router.refresh() でページを再取得する。
 */
export function AdminCollectionButton({ eventId, userId, collected: initialCollected }: Props) {
  const router = useRouter();
  const [collected, setCollected] = useState(initialCollected);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const next = !collected;
    setCollected(next);
    await fetchWithCsrf(`/api/admin/events/${eventId}/collections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, collected: next }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={
        collected
          ? "px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors disabled:opacity-50"
          : "px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
      }
    >
      {collected ? "徴収済" : "未徴収"}
    </button>
  );
}
