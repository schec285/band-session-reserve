"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import type { SongWithReservations } from "@/lib/types/api/events";
import type { Part } from "@drizzle/schema";

import { X } from "lucide-react";

import { PART_LABELS } from "@/lib/utils/parts";
import { CreateReservationsSchema } from "@/lib/types/api/reserve";
import { Button } from "@/components/ui/button";
import { EntryConfirmDialog, type EntryItem } from "@/features/reserve/EntryConfirmDialog";

/**
 * テーブルに表示するパートの順序定義。
 */
const PART_ORDER: Part[] = [
  "vocal",
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "other",
];

/**
 * 曲一覧とパート別予約状況を横並びテーブルで表示するコンポーネント。
 * ログイン済みの場合は空きパートにチェックボックスを表示し、右下のエントリーするボタンから確認ダイアログを経て一括エントリーができる。
 * 未ログインの場合は空きパートを「空き」表示のみとし、サインインへ誘導する。
 */
export function SongList({ songs }: { songs: SongWithReservations[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ reservationId: string; songTitle: string; part: string } | null>(null);
  const [canceling, setCanceling] = useState(false);

  const isLoggedIn = !!session;

  const selectedSongCount = new Set(
    Array.from(selected).map((key) => key.slice(0, key.indexOf(":")))
  ).size;

  if (songs.length === 0) {
    return <p className="text-sm text-muted-foreground">曲が登録されていません</p>;
  }

  function toggleEntry(eventSongId: string, part: string) {
    const key = `${eventSongId}:${part}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function buildEntryItems(): EntryItem[] {
    return Array.from(selected).map((key) => {
      const colonIndex = key.indexOf(":");
      const eventSongId = key.slice(0, colonIndex);
      const part = key.slice(colonIndex + 1) as Part;
      const song = songs.find((s) => s.eventSongId === eventSongId);
      return {
        eventSongId,
        part,
        songTitle: song?.title ?? "",
        songArtist: song?.artist ?? "",
      };
    });
  }

  async function handleConfirmSubmit({
    snsConsent,
    comment,
  }: {
    snsConsent: boolean;
    comment: string;
  }) {
    const entries = Array.from(selected).map((key) => {
      const colonIndex = key.indexOf(":");
      return {
        eventSongId: key.slice(0, colonIndex),
        part: key.slice(colonIndex + 1),
      };
    });

    const parsed = CreateReservationsSchema.safeParse({ entries, snsConsent, comment: comment || undefined });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }

    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries,
        snsConsent,
        comment: comment || undefined,
      }),
    });

    if (res.status === 401) {
      setDialogOpen(false);
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message ?? "エントリーに失敗しました");
    }

    setSelected(new Set());
    setDialogOpen(false);
    setSuccessMessage("エントリーを受け付けました！セッションでお待ちしています");
    startTransition(() => router.refresh());
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    setCanceling(true);
    const res = await fetch(`/api/reserve/${cancelTarget.reservationId}`, { method: "DELETE" });
    setCanceling(false);
    setCancelTarget(null);
    if (!res.ok) {
      const json = await res.json();
      setSuccessMessage(null);
      alert(json.message ?? "キャンセルに失敗しました");
      return;
    }
    setSuccessMessage("エントリーをキャンセルしました");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* 曲一覧テーブル */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {/* ヘッダー行 */}
          <thead>
            <tr className="bg-muted border-b">
              <th className="text-left px-4 py-3 font-medium w-40 sticky left-0 bg-muted z-10">
                曲
              </th>
              {PART_ORDER.map((part) => (
                <th key={part} className="text-center px-3 py-3 font-medium whitespace-nowrap">
                  {PART_LABELS[part]}
                </th>
              ))}
            </tr>
          </thead>

          {/* 曲ごとの行 */}
          <tbody>
            {songs.map((song, i) => {
              const reservationMap = new Map(
                song.reservations.map((r) => [r.part, { username: r.username, isOwner: r.isOwner, reservationId: r.reservationId }])
              );

              return (
                <tr key={song.id} className={i % 2 === 1 ? "bg-muted/20" : "bg-background"}>
                  {/* 曲名・アーティスト列（スクロール時に固定） */}
                  <td
                    className={`px-4 py-3 sticky left-0 z-10 ${
                      i % 2 === 1 ? "bg-muted" : "bg-background"
                    }`}
                  >
                    <p className="font-semibold leading-tight">{song.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{song.artist}</p>
                  </td>

                  {/* パートセル */}
                  {PART_ORDER.map((part) => {
                    const reservation = reservationMap.get(part);
                    const isRecruiting = reservation !== undefined;
                    const username = reservation?.username ?? null;
                    const isFilled = username != null;
                    const isOwner = reservation?.isOwner ?? false;
                    const reservationId = reservation?.reservationId ?? null;

                    if (!isRecruiting) {
                      return (
                        <td key={part} className="bg-muted/80 px-3 py-3 text-center">
                          <span className="text-muted-foreground/40 text-xs">─</span>
                        </td>
                      );
                    }

                    if (isFilled) {
                      return (
                        <td key={part} className={`px-3 py-3 text-center ${isOwner ? "bg-yellow-100" : ""}`}>
                          <span className="text-sm font-medium">{username}</span>
                          {isOwner && (
                            <button
                              onClick={() => setCancelTarget({ reservationId: reservationId!, songTitle: song.title, part: PART_LABELS[part] })}
                              className="ml-1.5 text-red-500 hover:text-red-700"
                              aria-label={`${song.title} ${PART_LABELS[part]} をキャンセル`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </td>
                      );
                    }

                    const key = `${song.eventSongId}:${part}`;
                    const isChecked = selected.has(key);

                    return (
                      <td key={part} className="px-3 py-3 text-center">
                        {isLoggedIn ? (
                          <input
                            type="checkbox"
                            aria-label={`${song.title} ${PART_LABELS[part]}`}
                            checked={isChecked}
                            onChange={() => toggleEntry(song.eventSongId, part)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">空き</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 未ログイン時の誘導 */}
      {!isLoggedIn && (
        <p className="text-sm text-muted-foreground">
          エントリーするには{" "}
          <a
            href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}
            className="underline text-foreground"
          >
            サインイン
          </a>
          が必要です。
        </p>
      )}

      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}

      {/* エントリーするボタン（右下） */}
      {isLoggedIn && (
        <div className="flex justify-end">
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={selected.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            エントリーする
            {selectedSongCount > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({selectedSongCount}曲)</span>
            )}
          </Button>
        </div>
      )}

      {/* エントリー確認ダイアログ */}
      <EntryConfirmDialog
        open={dialogOpen}
        entries={buildEntryItems()}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleConfirmSubmit}
      />

      {/* キャンセル確認ダイアログ */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl border shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold">エントリーのキャンセル</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{cancelTarget.songTitle}</span>
              {" / "}
              <span className="font-medium text-foreground">{cancelTarget.part}</span>
              {" のエントリーをキャンセルしますか？"}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={canceling}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={canceling}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {canceling ? "キャンセル中..." : "キャンセルする"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
