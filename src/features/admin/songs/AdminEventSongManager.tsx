"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  parts: { part: Part; entered: boolean }[];
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

/**
 * パートトグルバッジ1個分。押下時に onToggle を呼ぶ。
 * entered が true の場合は選択状態でも緑バッジで強調する。
 */
function PartToggleBadge({
  part,
  selected,
  entered,
  disabled,
  onToggle,
}: {
  part: Part;
  selected: boolean;
  entered: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        entered && selected
          ? "bg-green-100 text-green-700 border-green-300"
          : selected
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-muted"
      }`}
    >
      {PART_LABELS[part]}
    </button>
  );
}

/**
 * イベントの曲管理セクション。
 * 登録済み曲テーブル（チェックボックス一括削除・パートバッジのインライン編集・行ごとの単一削除）と
 * 曲追加テーブル（未登録曲をチェックボックスで複数選択し、曲ごとに個別のパートを指定して一括追加）で構成する。
 */
export function AdminEventSongManager({ eventId, eventSongs, allSongs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // 登録済み曲テーブルの状態
  const [checkedForDelete, setCheckedForDelete] = useState<Set<string>>(new Set());
  const [partUpdating, setPartUpdating] = useState<Set<string>>(new Set());
  const [confirmRemovePart, setConfirmRemovePart] = useState<ConfirmRemovePart | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 曲追加テーブルの状態
  const [checkedForAdd, setCheckedForAdd] = useState<Set<string>>(new Set());
  const [addParts, setAddParts] = useState<Map<string, Set<Part>>>(new Map());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const unregisteredSongs = useMemo(() => {
    const registeredSongIds = new Set(eventSongs.map((s) => s.songId));
    return allSongs.filter((song) => !registeredSongIds.has(song.id));
  }, [allSongs, eventSongs]);

  /**
   * 登録済み曲1件のパートバッジ選択を切り替える。
   * エントリー済みパートを外す場合は確認ダイアログを経由し、それ以外は即座にPATCHする。
   */
  function handlePartToggle(song: EventSong, part: Part) {
    const current = song.parts.find((p) => p.part === part);
    if (current) {
      if (current.entered) {
        setConfirmRemovePart({ song, part });
        return;
      }
      submitPartUpdate(song, song.parts.filter((p) => p.part !== part).map((p) => p.part));
    } else {
      submitPartUpdate(song, [...song.parts.map((p) => p.part), part]);
    }
  }

  /**
   * エントリー済みパートの除去を確認後に実行する。
   */
  function handleConfirmRemovePart() {
    if (!confirmRemovePart) return;
    const { song, part } = confirmRemovePart;
    setConfirmRemovePart(null);
    submitPartUpdate(song, song.parts.filter((p) => p.part !== part).map((p) => p.part));
  }

  /**
   * 募集パートの更新をAPIに送信する。成功時はToast表示とページ再読み込みを行う。
   */
  async function submitPartUpdate(song: EventSong, newParts: Part[]) {
    if (newParts.length === 0) {
      setToast({ message: "パートを1つ以上選択してください", variant: "error" });
      return;
    }

    setPartUpdating((prev) => new Set(prev).add(song.eventSongId));

    const res = await fetchWithCsrf(`/api/admin/event-songs/${song.eventSongId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: newParts }),
    });

    setPartUpdating((prev) => {
      const next = new Set(prev);
      next.delete(song.eventSongId);
      return next;
    });

    if (res.ok) {
      setToast({ message: `${song.title}のパートを更新しました`, variant: "success" });
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "パートの更新に失敗しました", variant: "error" });
    }
  }

  /**
   * 登録済み曲テーブルの削除チェックボックスを切り替える。
   */
  function toggleCheckedForDelete(eventSongId: string) {
    setCheckedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(eventSongId)) next.delete(eventSongId);
      else next.add(eventSongId);
      return next;
    });
  }

  /**
   * 登録済み曲を1件だけ削除する（行ごとの削除ボタン用）。
   */
  async function handleRowDelete(eventSongId: string) {
    if (!confirm("この曲をイベントから削除しますか？")) return;

    const res = await fetchWithCsrf(`/api/admin/event-songs/${eventSongId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setToast({ message: "曲を削除しました", variant: "success" });
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "削除に失敗しました", variant: "error" });
    }
  }

  /**
   * チェックボックスで選択した登録済み曲をまとめて削除する。
   */
  async function handleBulkDelete() {
    setBulkDeleting(true);

    const res = await fetchWithCsrf(`/api/admin/events/${eventId}/songs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventSongIds: Array.from(checkedForDelete) }),
    });

    setBulkDeleting(false);
    setBulkDeleteConfirmOpen(false);

    if (res.ok) {
      const json = await res.json();
      setToast({
        message: `${json.deletedEventSongIds.length}曲を削除しました`,
        variant: "success",
      });
      setCheckedForDelete(new Set());
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "削除に失敗しました", variant: "error" });
    }
  }

  /**
   * 曲追加テーブルの選択チェックボックスを切り替える。未選択にした曲のパート選択もクリアする。
   */
  function toggleCheckedForAdd(songId: string) {
    setCheckedForAdd((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }

  /**
   * 曲追加テーブルで、曲ごとに独立したパート選択を切り替える。
   */
  function toggleAddPart(songId: string, part: Part) {
    setAddParts((prev) => {
      const next = new Map(prev);
      const parts = new Set(next.get(songId) ?? []);
      if (parts.has(part)) parts.delete(part);
      else parts.add(part);
      next.set(songId, parts);
      return next;
    });
  }

  /**
   * チェックした曲を、曲ごとに指定したパートで一括追加する。
   */
  async function handleBulkAdd() {
    if (checkedForAdd.size === 0) {
      setAddError("曲を1つ以上選択してください");
      return;
    }

    const songs = Array.from(checkedForAdd).map((songId) => ({
      songId,
      parts: Array.from(addParts.get(songId) ?? []),
    }));

    if (songs.some((s) => s.parts.length === 0)) {
      setAddError("選択したすべての曲でパートを1つ以上選択してください");
      return;
    }

    setAddError("");
    setAdding(true);

    const res = await fetchWithCsrf(`/api/admin/events/${eventId}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songs }),
    });

    setAdding(false);

    if (res.ok) {
      const json = await res.json();
      setToast({ message: `${json.eventSongs.length}曲を追加しました`, variant: "success" });
      setCheckedForAdd(new Set());
      setAddParts(new Map());
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setAddError(json.message ?? "追加に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">イベント曲一覧</h2>
        {eventSongs.length === 0 ? (
          <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={checkedForDelete.size === eventSongs.length}
                      onChange={(e) =>
                        setCheckedForDelete(
                          e.target.checked ? new Set(eventSongs.map((s) => s.eventSongId)) : new Set()
                        )
                      }
                    />
                  </th>
                  <th className="text-left font-medium p-3">曲名 / アーティスト</th>
                  <th className="text-left font-medium p-3">募集パート</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {eventSongs.map((song) => (
                  <tr key={song.eventSongId} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={checkedForDelete.has(song.eventSongId)}
                        onChange={() => toggleCheckedForDelete(song.eventSongId)}
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{song.title}</p>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_PARTS.map((part) => {
                          const current = song.parts.find((p) => p.part === part);
                          return (
                            <PartToggleBadge
                              key={part}
                              part={part}
                              selected={current !== undefined}
                              entered={current?.entered ?? false}
                              disabled={partUpdating.has(song.eventSongId) || isPending}
                              onToggle={() => handlePartToggle(song, part)}
                            />
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRowDelete(song.eventSongId)}
                        disabled={isPending}
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={checkedForDelete.size === 0 || isPending}
            onClick={() => setBulkDeleteConfirmOpen(true)}
          >
            選択した曲を一括削除（{checkedForDelete.size}）
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">曲を追加する</h2>
        {unregisteredSongs.length === 0 ? (
          <p className="text-muted-foreground text-sm">追加できる曲がありません。</p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="text-left font-medium p-3">曲名 / アーティスト</th>
                  <th className="text-left font-medium p-3">募集パート</th>
                </tr>
              </thead>
              <tbody>
                {unregisteredSongs.map((song) => {
                  const checked = checkedForAdd.has(song.id);
                  const selectedParts = addParts.get(song.id) ?? new Set<Part>();
                  return (
                    <tr key={song.id} className="border-t">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer"
                          checked={checked}
                          onChange={() => toggleCheckedForAdd(song.id)}
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-xs text-muted-foreground">{song.artist}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_PARTS.map((part) => (
                            <PartToggleBadge
                              key={part}
                              part={part}
                              selected={selectedParts.has(part)}
                              entered={false}
                              disabled={!checked || adding}
                              onToggle={() => toggleAddPart(song.id, part)}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {addError && <p className="text-destructive text-sm mt-2">{addError}</p>}

        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            disabled={adding || isPending || unregisteredSongs.length === 0}
            onClick={handleBulkAdd}
          >
            {adding ? "追加中..." : `選択した曲を追加する（${checkedForAdd.size}）`}
          </Button>
        </div>
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

      {/* 一括削除確認ダイアログ */}
      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)}>
        <DialogHeader title="一括削除の確認" onClose={() => setBulkDeleteConfirmOpen(false)} />
        <DialogContent>
          <p className="text-sm">
            選択した{checkedForDelete.size}曲をイベントから削除します。よろしいですか？
          </p>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkDeleteConfirmOpen(false)}
            disabled={bulkDeleting}
          >
            キャンセル
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
