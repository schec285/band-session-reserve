"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
}

/**
 * イベント一覧の各行に表示する編集・削除ボタン。
 */
export function AdminEventActions({ eventId }: Props) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("このイベントを削除しますか？")) return;

    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });

    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.message ?? "削除に失敗しました");
    }
  }

  return (
    <div className="flex gap-2 shrink-0 ml-4">
      <Link
        href={`/admin/events/${eventId}/edit`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        編集
      </Link>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        削除
      </Button>
    </div>
  );
}
