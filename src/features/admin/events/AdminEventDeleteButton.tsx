"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  eventId: string;
}

/**
 * イベント詳細ページ下部に表示する削除ボタン。
 * 確認ダイアログ後に DELETE リクエストを送信し、成功時は一覧へリダイレクトする。
 */
export function AdminEventDeleteButton({ eventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    if (!confirm("このイベントを削除しますか？")) return;

    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });

    if (res.ok) {
      startTransition(() => router.push("/admin/events"));
    } else {
      const json = await res.json();
      alert(json.message ?? "削除に失敗しました");
    }
  }

  return (
    <Button
      variant="ghost"
      className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full h-8 text-sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "削除中..." : "このイベントを削除する"}
    </Button>
  );
}
