"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Toast, type ToastVariant } from "@/components/ui/Toast";
import { PART_LABELS, PART_ORDER } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

const ALL_PARTS = PART_ORDER;

interface EventSong {
  eventSongId: string;
  songId: string;
  title: string;
  artist: string;
  parts: { part: Part; entered: boolean; username: string | null }[];
}

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Props {
  eventId: string;
  eventSongs: EventSong[];
  allSongs: Song[];
}

interface ConfirmRemovePart {
  song: EventSong;
  part: Part;
}

interface PendingAdd {
  id: string;
  songId: string;
  parts: Set<Part>;
}

/**
 * サーバー側の登録内容から、編集中のパート選択(draft)の初期値を作る。
 */
function buildDraftPartsFromEventSongs(eventSongs: EventSong[]): Map<string, Set<Part>> {
  return new Map(eventSongs.map((s) => [s.eventSongId, new Set(s.parts.map((p) => p.part))]));
}

/**
 * eventSongId・part の組から pendingEntrantRemovals 用のキーを作る。
 */
function entrantKey(eventSongId: string, part: Part): string {
  return `${eventSongId}:${part}`;
}

/**
 * イベントの曲管理セクション。
 * 曲の追加・パート変更・削除はその場でAPIを呼ばず、いったんローカルの編集内容(draft)として保持する。
 * 既存曲は変更なし=通常色、パート変更あり=オレンジ、削除予定=赤（全操作不可・ボタンは「戻す」に変化）で表示し、
 * 新規に追加予定の曲は緑（パートはデフォルト全選択）で登録済み曲テーブルに表示する。
 * 「更新する」ボタンで一括してAPIに送信し、「変更を破棄する」ボタンで編集内容を破棄してサーバーの状態に戻す。
 */
export function AdminEventSongManager({ eventId, eventSongs, allSongs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [committing, setCommitting] = useState(false);

  // 登録済み曲の編集中パート選択（draft）。サーバーの eventSongs が更新されたら同期し直す。
  const [draftParts, setDraftParts] = useState<Map<string, Set<Part>>>(() =>
    buildDraftPartsFromEventSongs(eventSongs)
  );
  // 削除予定としてマークされた eventSongId の集合。
  const [markedForDelete, setMarkedForDelete] = useState<Set<string>>(new Set());
  // 新規追加予定の曲の一覧。同じ曲を複数回追加できるよう、songId ではなく生成したid をキーに持つ。
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([]);

  const [confirmRemovePart, setConfirmRemovePart] = useState<ConfirmRemovePart | null>(null);
  // 削除予定としてマークされたエントリー（予約）の集合。キーは `${eventSongId}:${part}`。
  const [pendingEntrantRemovals, setPendingEntrantRemovals] = useState<Set<string>>(new Set());

  // 曲追加の検索キーワード。
  const [searchQuery, setSearchQuery] = useState("");
  // 検索結果のドロップダウンを表示するかどうか。検索欄からフォーカスが外れたら閉じる。
  const [searchOpen, setSearchOpen] = useState(false);

  /**
   * サーバーから受け取った eventSongs が変わったら（初回表示・更新後の再読み込み時）、
   * 編集中の draft をすべてリセットしてサーバーの状態に同期し直す。
   */
  useEffect(() => {
    setDraftParts(buildDraftPartsFromEventSongs(eventSongs));
    setMarkedForDelete(new Set());
    setPendingAdds([]);
    setPendingEntrantRemovals(new Set());
  }, [eventSongs]);

  const disabled = committing || isPending;

  /**
   * 曲名の部分一致（大文字小文字を区別しない）で曲マスタを検索する。
   * 検索語が空の場合は先頭から10件、入力がある場合は部分一致するものを最大10件返す。
   * 同じ曲を複数回追加できるよう、登録済み・追加予定かどうかによる絞り込みは行わない。
   */
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query === "" ? allSongs : allSongs.filter((song) => song.title.toLowerCase().includes(query));
    return matched.slice(0, 10);
  }, [allSongs, searchQuery]);

  /**
   * 既存曲のパート選択がサーバー側の内容から変更されているかどうかを判定する。
   */
  function isPartsChanged(song: EventSong): boolean {
    const original = new Set(song.parts.map((p) => p.part));
    const draft = draftParts.get(song.eventSongId) ?? original;
    if (original.size !== draft.size) return true;
    for (const part of original) {
      if (!draft.has(part)) return true;
    }
    return false;
  }

  /**
   * 既存曲のdraftパート選択を1件更新する。
   */
  function applyDraftPartChange(eventSongId: string, part: Part, include: boolean) {
    setDraftParts((prev) => {
      const next = new Map(prev);
      const parts = new Set(next.get(eventSongId) ?? []);
      if (include) parts.add(part);
      else parts.delete(part);
      next.set(eventSongId, parts);
      return next;
    });
  }

  /**
   * 既存曲のパートチェックボックスを切り替える。
   * エントリー済みパートを外す場合は確認ダイアログを経由し、最後の1パートは外せないようにする。
   */
  function handlePartToggle(song: EventSong, part: Part) {
    const current = draftParts.get(song.eventSongId) ?? new Set<Part>();
    const isSelected = current.has(part);

    if (isSelected) {
      const entered = song.parts.find((p) => p.part === part)?.entered ?? false;
      if (entered) {
        setConfirmRemovePart({ song, part });
        return;
      }
      if (current.size === 1) {
        setToast({ message: "パートを1つ以上選択してください", variant: "error" });
        return;
      }
      applyDraftPartChange(song.eventSongId, part, false);
    } else {
      applyDraftPartChange(song.eventSongId, part, true);
    }
  }

  /**
   * エントリー済みパートの除去を確認後、draftに反映する（APIはまだ呼ばない）。
   */
  function handleConfirmRemovePart() {
    if (!confirmRemovePart) return;
    const { song, part } = confirmRemovePart;
    setConfirmRemovePart(null);
    applyDraftPartChange(song.eventSongId, part, false);
  }

  /**
   * エントリー者名をクリックしたときの処理。
   * 削除予定マークを直接トグルする（APIはまだ呼ばない。募集パート自体は維持される）。
   */
  function handleEntrantClick(song: EventSong, part: Part) {
    const key = entrantKey(song.eventSongId, part);
    setPendingEntrantRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /**
   * 既存曲の削除予定マークを切り替える（ボタンは「削除」⇔「戻す」に変化する）。
   */
  function toggleMarkedForDelete(eventSongId: string) {
    setMarkedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(eventSongId)) next.delete(eventSongId);
      else next.add(eventSongId);
      return next;
    });
  }

  /**
   * 検索結果の曲を新規追加予定としてステージングする。クリックするたびに新しい追加予定行が1件増え、
   * 同じ曲を複数回追加することもできる。パートはデフォルトで全選択にする。
   */
  function handleAddSearchResult(songId: string) {
    setPendingAdds((prev) => [...prev, { id: crypto.randomUUID(), songId, parts: new Set(ALL_PARTS) }]);
  }

  /**
   * 新規追加予定を取り消す。
   */
  function unstageAdd(id: string) {
    setPendingAdds((prev) => prev.filter((p) => p.id !== id));
  }

  /**
   * 新規追加予定の曲のパートチェックボックスを切り替える。
   */
  function togglePendingAddPart(id: string, part: Part) {
    setPendingAdds((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.parts.has(part) && p.parts.size === 1) {
          setToast({ message: "パートを1つ以上選択してください", variant: "error" });
          return p;
        }
        const parts = new Set(p.parts);
        if (parts.has(part)) parts.delete(part);
        else parts.add(part);
        return { ...p, parts };
      })
    );
  }

  /**
   * 編集中の内容（追加予定・パート変更・削除予定）をすべて破棄し、サーバーの状態に戻す。
   */
  function handleDiscard() {
    setDraftParts(buildDraftPartsFromEventSongs(eventSongs));
    setMarkedForDelete(new Set());
    setPendingAdds([]);
    setPendingEntrantRemovals(new Set());
    setToast({ message: "変更を破棄しました", variant: "success" });
  }

  /**
   * 編集中の内容をまとめてAPIに送信する。
   * 新規追加はbulk追加API、削除予定はbulk削除API、パート変更は曲ごとにPATCHを呼び、並行して実行する。
   */
  async function handleCommit() {
    const changedSongs = eventSongs.filter(
      (song) => !markedForDelete.has(song.eventSongId) && isPartsChanged(song)
    );

    // 曲ごと削除・パート自体の削除ですでにカバーされるエントリー削除は除外する（cascadeで削除されるため）。
    const entrantRemovalTargets = Array.from(pendingEntrantRemovals)
      .map((key) => {
        const [eventSongId, part] = key.split(":") as [string, Part];
        return { eventSongId, part };
      })
      .filter(({ eventSongId, part }) => {
        if (markedForDelete.has(eventSongId)) return false;
        const draft = draftParts.get(eventSongId);
        if (draft && !draft.has(part)) return false;
        return true;
      });

    const tasks: Promise<Response>[] = [];

    if (pendingAdds.length > 0) {
      tasks.push(
        fetchWithCsrf(`/api/admin/events/${eventId}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songs: pendingAdds.map(({ songId, parts }) => ({
              songId,
              parts: Array.from(parts),
            })),
          }),
        })
      );
    }

    if (markedForDelete.size > 0) {
      tasks.push(
        fetchWithCsrf(`/api/admin/events/${eventId}/songs`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventSongIds: Array.from(markedForDelete) }),
        })
      );
    }

    for (const song of changedSongs) {
      tasks.push(
        fetchWithCsrf(`/api/admin/event-songs/${song.eventSongId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parts: Array.from(draftParts.get(song.eventSongId) ?? []) }),
        })
      );
    }

    for (const { eventSongId, part } of entrantRemovalTargets) {
      tasks.push(
        fetchWithCsrf(`/api/admin/event-songs/${eventSongId}/reservations/${part}`, {
          method: "DELETE",
        })
      );
    }

    if (tasks.length === 0) {
      setToast({ message: "変更はありません", variant: "warning" });
      return;
    }

    setCommitting(true);
    const results = await Promise.allSettled(tasks);
    setCommitting(false);

    const failed = results.filter((r) => r.status === "rejected" || !r.value.ok);

    if (failed.length === 0) {
      setToast({ message: "イベントに曲を登録・更新しました。", variant: "success" });
    } else {
      setToast({ message: "一部の変更に失敗しました", variant: "error" });
    }

    startTransition(() => router.refresh());
  }

  const pendingCount =
    pendingAdds.length +
    markedForDelete.size +
    eventSongs.filter(isPartsChanged).length +
    pendingEntrantRemovals.size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">曲を追加する</h2>
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setSearchOpen(false);
            }
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onClick={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchOpen(false);
            }}
            placeholder="曲名で検索"
            disabled={disabled}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border bg-background shadow-lg">
              {searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm p-3">該当する曲がありません。</p>
              ) : (
                <div className="divide-y">
                  {searchResults.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => handleAddSearchResult(song.id)}
                      disabled={disabled}
                      className="w-full text-left p-3 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <p className="font-medium text-sm">{song.title}</p>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">イベント曲一覧</h2>
        {eventSongs.length === 0 && pendingAdds.length === 0 ? (
          <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-medium p-3 w-40">曲名 / アーティスト</th>
                  {ALL_PARTS.map((part) => (
                    <th key={part} className="text-center font-medium p-2 whitespace-nowrap">
                      {PART_LABELS[part]}
                    </th>
                  ))}
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {eventSongs.map((song) => {
                  const isDeleted = markedForDelete.has(song.eventSongId);
                  const changed = !isDeleted && isPartsChanged(song);
                  const rowClass = isDeleted ? "bg-red-50" : changed ? "bg-orange-50" : "";
                  const draft = draftParts.get(song.eventSongId) ?? new Set<Part>();

                  return (
                    <tr key={song.eventSongId} className={`border-t ${rowClass}`}>
                      <td className="p-3">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-xs text-muted-foreground">{song.artist}</p>
                      </td>
                      {ALL_PARTS.map((part) => {
                        const current = song.parts.find((p) => p.part === part);
                        const entered = current?.entered ?? false;
                        const username = current?.username ?? null;
                        const checked = draft.has(part);
                        const removalMarked =
                          entered &&
                          username !== null &&
                          (isDeleted || !checked || pendingEntrantRemovals.has(entrantKey(song.eventSongId, part)));
                        return (
                          <td key={part} className="text-center p-2">
                            <input
                              type="checkbox"
                              aria-label={`${song.title} ${PART_LABELS[part]}`}
                              className="h-4 w-4 cursor-pointer"
                              checked={checked}
                              disabled={isDeleted || disabled}
                              onChange={() => handlePartToggle(song, part)}
                            />
                            {entered && username ? (
                              <button
                                type="button"
                                onClick={() => handleEntrantClick(song, part)}
                                disabled={isDeleted || disabled || !checked}
                                className={`mt-0.5 block h-4 w-full max-w-16 mx-auto truncate text-xs leading-tight disabled:cursor-not-allowed ${
                                  removalMarked
                                    ? "text-destructive line-through"
                                    : "text-muted-foreground hover:underline"
                                }`}
                              >
                                {username}
                              </button>
                            ) : (
                              <p className="mt-0.5 h-4 text-xs leading-tight text-muted-foreground"> </p>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right">
                        <Button
                          variant={isDeleted ? "outline" : "destructive"}
                          size="icon"
                          onClick={() => toggleMarkedForDelete(song.eventSongId)}
                          disabled={disabled}
                          aria-label={isDeleted ? `${song.title}の削除を取り消す` : `${song.title}を削除`}
                        >
                          {isDeleted ? <Undo2 className="size-4.5" /> : <Trash2 className="size-4.5" />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {pendingAdds.map(({ id, songId, parts }) => {
                  const song = allSongs.find((s) => s.id === songId);
                  if (!song) return null;
                  return (
                    <tr key={id} className="border-t bg-green-50">
                      <td className="p-3">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-xs text-muted-foreground">{song.artist}</p>
                      </td>
                      {ALL_PARTS.map((part) => (
                        <td key={part} className="text-center p-2">
                          <input
                            type="checkbox"
                            aria-label={`${song.title} ${PART_LABELS[part]}`}
                            className="h-4 w-4 cursor-pointer"
                            checked={parts.has(part)}
                            disabled={disabled}
                            onChange={() => togglePendingAddPart(id, part)}
                          />
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => unstageAdd(id)}
                          disabled={disabled}
                          aria-label={`${song.title}を追加予定から削除`}
                        >
                          <Trash2 className="size-4.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDiscard}
          disabled={disabled || pendingCount === 0}
        >
          変更を破棄する
        </Button>
        <Button size="sm" onClick={handleCommit} disabled={disabled || pendingCount === 0}>
          {committing ? "更新中..." : `更新する（${pendingCount}）`}
        </Button>
      </div>

      {/* エントリー済みパート除去確認ダイアログ */}
      <Dialog open={confirmRemovePart !== null} onClose={() => setConfirmRemovePart(null)}>
        <DialogHeader
          title="エントリー済みパートの削除確認"
          onClose={() => setConfirmRemovePart(null)}
        />
        <DialogContent>
          <p className="text-sm">
            「{confirmRemovePart ? PART_LABELS[confirmRemovePart.part] : ""}」にはすでにエントリーがあります。
            このパートを募集から外してもよいですか？
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setConfirmRemovePart(null)}>
            キャンセル
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirmRemovePart}>
            外す
          </Button>
        </DialogFooter>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
