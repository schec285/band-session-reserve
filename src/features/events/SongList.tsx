"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import type { SongWithReservations } from "@/lib/types/domain/events";
import type { Part } from "@drizzle/schema";

import { PART_LABELS } from "@/lib/utils/parts";
import { CreateReservationsSchema } from "@/lib/types/api/reserve";
import { Button } from "@/components/ui/button";
import { EntryConfirmDialog, type EntryItem } from "@/features/reserve/EntryConfirmDialog";

/**
 * テーブルに表示するパートの順序定義。
 */
const PART_ORDER: Part[] = [
  "vocal",
  "chorus",
  "readGuitar",
  "backingGuitar",
  "bass",
  "drums",
  "keyboard",
  "other",
];

/**
 * 曲一覧とパート別予約状況を横並びテーブルで表示するコンポーネント。
 * ログイン済みかつ募集中の場合は空きパートにチェックボックスを表示し、右下のエントリーするボタンから確認ダイアログを経て一括エントリーができる。
 * 未ログインまたは募集終了の場合は空きパートを「空き」表示のみとし、未ログインのときはサインインへ誘導する。
 * 自分のエントリーは名前をリンク風に表示し、クリックで管理モーダルを開く。
 */
export function SongList({ songs, isClosed = false }: { songs: SongWithReservations[]; isClosed?: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manageTarget, setManageTarget] = useState<{
    reservationId: string;
    songTitle: string;
    part: string;
    isTransferable: boolean;
  } | null>(null);
  const [manageLoading, setManageLoading] = useState(false);

  const isLoggedIn = !!session;
  const canEntry = isLoggedIn && !isClosed;

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
    transferableKeys,
  }: {
    snsConsent: boolean;
    comment: string;
    transferableKeys: Set<string>;
  }) {
    const entries = Array.from(selected).map((key) => {
      const colonIndex = key.indexOf(":");
      return {
        eventSongId: key.slice(0, colonIndex),
        part: key.slice(colonIndex + 1),
        isTransferable: transferableKeys.has(key),
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

  async function handleToggleTransferable() {
    if (!manageTarget) return;
    setManageLoading(true);
    const res = await fetch(`/api/reserve/${manageTarget.reservationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTransferable: !manageTarget.isTransferable }),
    });
    setManageLoading(false);
    if (!res.ok) {
      const json = await res.json();
      alert(json.message ?? "更新に失敗しました");
      return;
    }
    setManageTarget(null);
    setSuccessMessage(!manageTarget.isTransferable ? "譲渡可能に設定しました" : "譲渡不可に設定しました");
    startTransition(() => router.refresh());
  }

  async function handleCancel() {
    if (!manageTarget) return;
    setManageLoading(true);
    const res = await fetch(`/api/reserve/${manageTarget.reservationId}`, { method: "DELETE" });
    setManageLoading(false);
    if (!res.ok) {
      const json = await res.json();
      alert(json.message ?? "キャンセルに失敗しました");
      return;
    }
    setManageTarget(null);
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
                song.reservations.map((r) => [r.part, r])
              );

              return (
                <tr key={song.eventSongId} className={i % 2 === 1 ? "bg-muted/20" : "bg-background"}>
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
                          {isOwner ? (
                            <button
                              onClick={() => setManageTarget({
                                reservationId: reservation.reservationId!,
                                songTitle: song.title,
                                part: PART_LABELS[part],
                                isTransferable: reservation.isTransferable,
                              })}
                              className="text-sm font-medium underline underline-offset-2 text-blue-700 hover:text-blue-900"
                              aria-label={`${song.title} ${PART_LABELS[part]} を管理`}
                            >
                              {username}
                              {reservation.isTransferable && (
                                <span className="ml-1 text-xs text-green-600 font-normal">(譲渡可)</span>
                              )}
                            </button>
                          ) : (
                            <span className="text-sm font-medium">
                              {username}
                              {reservation.isTransferable && (
                                <span className="ml-1 text-xs text-green-600 font-normal">(譲渡可)</span>
                              )}
                            </span>
                          )}
                        </td>
                      );
                    }

                    const key = `${song.eventSongId}:${part}`;
                    const isChecked = selected.has(key);

                    return (
                      <td key={part} className="px-3 py-3 text-center">
                        {canEntry ? (
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
      {!isLoggedIn && !isClosed && (
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
      {canEntry && (
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

      {/* エントリー管理モーダル */}
      {manageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl border shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold">エントリーの管理</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{manageTarget.songTitle}</span>
              {" / "}
              <span className="font-medium text-foreground">{manageTarget.part}</span>
            </p>

            {/* 譲渡可能トグル */}
            <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">譲渡可能</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  現在：{manageTarget.isTransferable ? "譲渡可能" : "譲渡不可"}
                </p>
              </div>
              <button
                onClick={handleToggleTransferable}
                disabled={manageLoading}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors disabled:opacity-50 ${
                  manageTarget.isTransferable
                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                    : "border-border hover:bg-muted"
                }`}
              >
                {manageTarget.isTransferable ? "譲渡不可にする" : "譲渡可能にする"}
              </button>
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={handleCancel}
                disabled={manageLoading}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {manageLoading ? "処理中..." : "エントリーをキャンセル"}
              </button>
              <button
                onClick={() => setManageTarget(null)}
                disabled={manageLoading}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
