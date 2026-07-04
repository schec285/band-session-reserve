"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

interface Props {
  eventId: string;
}

/**
 * イベント詳細ページ下部に表示する削除ボタン。
 * 確認ダイアログ後に DELETE リクエストを送信し、成功時は一覧へリダイレクトする。
 */
export function AdminEventDeleteButton({ eventId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const res = await fetchWithCsrf(`/api/admin/events/${eventId}`, { method: "DELETE" });

    if (res.ok) {
      setOpen(false);
      startTransition(() => router.push("/admin/events"));
    } else {
      const json = await res.json();
      alert(json.message ?? "削除に失敗しました");
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full h-8 text-sm"
        onClick={() => setOpen(true)}
      >
        このイベントを削除する
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader title="イベントの削除" onClose={() => setOpen(false)} />
        <DialogContent>
          <p className="text-sm">このイベントを削除しますか？この操作は元に戻せません。</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
