"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { PART_LABELS, PART_ORDER } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

const ALL_PARTS = Object.keys(PART_LABELS) as Part[];

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

/**
 * イベントの曲管理セクション。
 * セクション全体をアコーディオンで開閉でき、曲一覧はカード表示、追加・パート編集はポップアップダイアログで行う。
 */
export function AdminEventSongManager({ eventId, eventSongs, allSongs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sectionOpen, setSectionOpen] = useState(false);

  // 追加ダイアログの状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // パート編集ダイアログの状態
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<EventSong | null>(null);
  const [editSelectedParts, setEditSelectedParts] = useState<Part[]>([]);
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [confirmRemovePart, setConfirmRemovePart] = useState<Part | null>(null);

  // 追加直後に自動スクロールするための追跡
  const pendingScrollSongId = useRef<string | null>(null);
  const songRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /**
   * eventSongs が更新されたとき、追加した曲へ自動スクロールする。
   * アコーディオンが閉じていた場合は自動で開く。
   */
  useEffect(() => {
    const targetSongId = pendingScrollSongId.current;
    if (!targetSongId) return;

    const newSong = eventSongs.find((s) => s.songId === targetSongId);
    if (!newSong) return;

    pendingScrollSongId.current = null;
    setSectionOpen(true);

    requestAnimationFrame(() => {
      songRefs.current.get(newSong.eventSongId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [eventSongs]);

  /**
   * 追加ダイアログのパート選択・解除を切り替える。
   */
  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  /**
   * 追加ダイアログを閉じてフォームをリセットする。
   */
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedSongId("");
    setSelectedParts([]);
    setError("");
  }, []);

  /**
   * 曲をイベントに追加する。追加後はダイアログを閉じ、追加した曲へ自動スクロールする。
   */
  async function handleAdd() {
    if (!selectedSongId || selectedParts.length === 0) {
      setError("曲とパートを選択してください");
      return;
    }

    setError("");
    setAdding(true);

    const res = await fetch(`/api/admin/events/${eventId}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: selectedSongId, parts: selectedParts }),
    });

    setAdding(false);

    if (res.ok) {
      pendingScrollSongId.current = selectedSongId;
      handleCloseDialog();
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setError(json.message ?? "追加に失敗しました");
    }
  }

  /**
   * 曲をイベントから削除する。
   */
  async function handleDelete(eventSongId: string) {
    if (!confirm("この曲をイベントから削除しますか？")) return;

    const res = await fetch(`/api/admin/event-songs/${eventSongId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      alert(json.message ?? "削除に失敗しました");
    }
  }

  /**
   * パート編集ダイアログを開き、現在のパートで初期化する。
   */
  function handleOpenEditDialog(song: EventSong) {
    setEditingSong(song);
    setEditSelectedParts(song.parts.map((p) => p.part));
    setEditError("");
    setEditDialogOpen(true);
  }

  /**
   * パート編集ダイアログを閉じてリセットする。
   */
  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditingSong(null);
    setEditSelectedParts([]);
    setEditError("");
    setConfirmRemovePart(null);
  }, []);

  /**
   * パート編集ダイアログのトグル処理。
   * エントリー済みパートを外す場合は確認ダイアログを経由する。
   */
  function toggleEditPart(part: Part) {
    if (!editSelectedParts.includes(part)) {
      setEditSelectedParts((prev) => [...prev, part]);
    } else {
      const isEntered = editingSong?.parts.find((p) => p.part === part)?.entered ?? false;
      if (isEntered) {
        setConfirmRemovePart(part);
      } else {
        setEditSelectedParts((prev) => prev.filter((p) => p !== part));
      }
    }
  }

  /**
   * エントリー済みパートの削除を確認後に実行する。
   */
  function handleConfirmRemovePart() {
    if (!confirmRemovePart) return;
    setEditSelectedParts((prev) => prev.filter((p) => p !== confirmRemovePart));
    setConfirmRemovePart(null);
  }

  /**
   * 募集パートを更新する。
   */
  async function handleUpdateParts() {
    if (!editingSong) return;

    if (editSelectedParts.length === 0) {
      setEditError("パートを1つ以上選択してください");
      return;
    }

    setEditError("");
    setUpdating(true);

    const res = await fetch(`/api/admin/event-songs/${editingSong.eventSongId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: editSelectedParts }),
    });

    setUpdating(false);

    if (res.ok) {
      handleCloseEditDialog();
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setEditError(json.message ?? "更新に失敗しました");
    }
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        {/* アコーディオンヘッダー */}
        <button
          type="button"
          onClick={() => setSectionOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="text-xl font-bold">イベント曲一覧</span>
          {sectionOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* アコーディオンコンテンツ */}
        {sectionOpen && (
          <div className="border-t px-5 py-5 space-y-4">
            {/* 登録済み曲一覧（カード） */}
            {eventSongs.length === 0 ? (
              <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
            ) : (
              <div className="space-y-2">
                {eventSongs.map((song) => (
                  <div
                    key={song.eventSongId}
                    ref={(el) => {
                      if (el) {
                        songRefs.current.set(song.eventSongId, el);
                      } else {
                        songRefs.current.delete(song.eventSongId);
                      }
                    }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{song.title}</p>
                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...song.parts].sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part)).map(({ part, entered }) => (
                          <span
                            key={part}
                            className={
                              entered
                                ? "px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-300"
                                : "px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border"
                            }
                          >
                            {PART_LABELS[part] ?? part}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(song)}
                        disabled={isPending}
                      >
                        パート編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(song.eventSongId)}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 曲追加ボタン（アコーディオン外・右寄せ） */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={isPending}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          曲を追加する
        </Button>
      </div>

      {/* 曲追加ポップアップ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogHeader title="曲を追加する" onClose={handleCloseDialog} />
        <DialogContent>
          <div className="space-y-1">
            <label className="text-sm">曲を選択</label>
            <select
              value={selectedSongId}
              onChange={(e) => setSelectedSongId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">選択してください</option>
              {allSongs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} / {song.artist}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm">募集するパート</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => togglePart(part)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedParts.includes(part)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {PART_LABELS[part]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCloseDialog}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={adding || isPending}>
            {adding || isPending ? "追加中..." : "追加する"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* パート編集ダイアログ */}
      {editingSong && (
        <>
          <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
            <DialogHeader title="募集パートを編集" onClose={handleCloseEditDialog} />
            <DialogContent>
              <p className="text-sm text-muted-foreground">
                {editingSong.title} / {editingSong.artist}
              </p>

              <div className="space-y-1">
                <label className="text-sm">募集するパート</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALL_PARTS.map((part) => {
                    const isSelected = editSelectedParts.includes(part);
                    const isEntered = editingSong.parts.find((p) => p.part === part)?.entered ?? false;
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => toggleEditPart(part)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          isEntered && isSelected
                            ? "bg-green-100 text-green-700 border-green-300"
                            : isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {PART_LABELS[part]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">緑はエントリー済みパートです</p>
              </div>

              {editError && <p className="text-destructive text-sm">{editError}</p>}
            </DialogContent>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleCloseEditDialog}>
                キャンセル
              </Button>
              <Button size="sm" onClick={handleUpdateParts} disabled={updating || isPending}>
                {updating || isPending ? "更新中..." : "更新する"}
              </Button>
            </DialogFooter>
          </Dialog>

          {/* エントリー済みパート削除確認ダイアログ */}
          <Dialog open={confirmRemovePart !== null} onClose={() => setConfirmRemovePart(null)}>
            <DialogHeader
              title="エントリー済みパートの削除確認"
              onClose={() => setConfirmRemovePart(null)}
            />
            <DialogContent>
              <p className="text-sm">
                「{confirmRemovePart ? PART_LABELS[confirmRemovePart] : ""}」にはすでにエントリーがあります。
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
        </>
      )}
    </div>
  );
}
