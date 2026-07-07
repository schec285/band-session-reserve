"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Toast, type ToastVariant } from "@/components/ui/Toast";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

interface Song {
  id: string;
  title: string;
  artist: string;
  inUse: boolean;
}

interface Props {
  songs: Song[];
}

/** イベントで使用中の曲を削除する際、入力を求める確認ワード。 */
const DELETE_CONFIRM_WORD = "続行";

/**
 * アーティスト名でグルーピングした曲一覧を、アーティストごとのアコーディオンで表示するコンポーネント。
 * songs はアーティスト名昇順・曲名昇順でソート済みであることを前提とする。
 * 曲名・アーティスト名での検索フィルター、曲名の編集・曲の削除機能を持つ。
 */
export function ArtistSongAccordion({ songs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");

  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // 曲名・アーティスト名の部分一致（大文字小文字を区別しない）でフィルタする。検索語が空の場合は全件。
  const filteredSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query === "") return songs;
    return songs.filter(
      (song) => song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  const isSearching = searchQuery.trim() !== "";

  const groups = new Map<string, Song[]>();
  for (const song of filteredSongs) {
    const group = groups.get(song.artist);
    if (group) {
      group.push(song);
    } else {
      groups.set(song.artist, [song]);
    }
  }

  function handleRequestEdit(song: Song) {
    setEditTarget(song);
    setEditTitle(song.title);
    setEditError(null);
  }

  /**
   * 曲名編集ダイアログでの保存操作。曲名のみ更新する。
   * 成功時は一覧を再取得しトースト通知、失敗時はトースト通知のみ出す。
   */
  async function handleConfirmEdit() {
    if (!editTarget) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("曲名は必須です");
      return;
    }

    setEditSubmitting(true);
    const res = await fetchWithCsrf(`/api/admin/songs/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle }),
    });

    setEditSubmitting(false);
    setEditTarget(null);

    if (res.ok) {
      setToast({ message: "曲名を更新しました", variant: "success" });
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "更新に失敗しました", variant: "error" });
    }
  }

  function handleRequestDelete(song: Song) {
    setDeleteTarget(song);
    setDeleteConfirmText("");
  }

  function handleCloseDeleteDialog() {
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }

  /**
   * 削除確認ダイアログでの確定操作。成功時は一覧を再取得しトースト通知、失敗時はトースト通知のみ出す。
   */
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetchWithCsrf(`/api/admin/songs/${deleteTarget.id}`, { method: "DELETE" });

    setDeleting(false);
    setDeleteTarget(null);
    setDeleteConfirmText("");

    if (res.ok) {
      setToast({ message: "曲を削除しました", variant: "success" });
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setToast({ message: json.message ?? "削除に失敗しました", variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="曲名・アーティスト名で検索"
      />

      {filteredSongs.length === 0 ? (
        <p className="text-muted-foreground text-sm">該当する曲がありません。</p>
      ) : (
        <div className="space-y-2">
          {Array.from(groups.entries()).map(([artist, artistSongs]) => (
            <ArtistGroup
              key={artist}
              artist={artist}
              songs={artistSongs}
              forceOpen={isSearching}
              onRequestEdit={handleRequestEdit}
              onRequestDelete={handleRequestDelete}
            />
          ))}
        </div>
      )}

      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)}>
        <DialogHeader title="曲名編集" onClose={() => setEditTarget(null)} />
        <DialogContent>
          <p className="text-sm">
            <span className="text-muted-foreground">アーティスト </span>
            {editTarget?.artist}
          </p>
          <div className="space-y-1">
            <Label htmlFor="edit-title">曲名</Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setEditError(null);
              }}
            />
            {editError && <p className="text-destructive text-sm">{editError}</p>}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditTarget(null)}>
            キャンセル
          </Button>
          <Button type="button" size="sm" onClick={handleConfirmEdit} disabled={editSubmitting}>
            保存する
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={deleteTarget !== null} onClose={handleCloseDeleteDialog}>
        <DialogHeader
          title={deleteTarget?.inUse ? "警告：使用中の曲を削除します" : "削除確認"}
          onClose={handleCloseDeleteDialog}
        />
        <DialogContent>
          {deleteTarget?.inUse ? (
            <div className="space-y-4">
              <SongSummaryCard song={deleteTarget} />
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">
                  上記の曲はイベントに登録されています。削除すると、登録されている全てのイベントからこの曲が
                  削除され、エントリー（予約）もすべて削除されます。この操作は元に戻せません。
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="delete-confirm-text">
                  続行するには「{DELETE_CONFIRM_WORD}」と入力してください
                </Label>
                <Input
                  id="delete-confirm-text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {deleteTarget && <SongSummaryCard song={deleteTarget} />}
              <p className="text-sm">上記を削除します。よろしいですか？</p>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={handleCloseDeleteDialog}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={
              deleting || isPending || (deleteTarget?.inUse && deleteConfirmText !== DELETE_CONFIRM_WORD)
            }
          >
            削除する
          </Button>
        </DialogFooter>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}

/**
 * 単一アーティストの曲一覧をアコーディオン表示するコンポーネント。デフォルトは閉じた状態。
 * forceOpen が true の場合（検索中）は常に展開表示する。
 */
function ArtistGroup({
  artist,
  songs,
  forceOpen,
  onRequestEdit,
  onRequestDelete,
}: {
  artist: string;
  songs: Song[];
  forceOpen: boolean;
  onRequestEdit: (song: Song) => void;
  onRequestDelete: (song: Song) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted transition-colors"
      >
        <span className="font-medium text-sm">
          {artist}
          <span className="ml-2 text-xs text-muted-foreground">{songs.length}曲</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="divide-y border-t">
          {songs.map((song) => (
            <div key={song.id} className="flex items-center justify-between gap-2 p-3 pl-6">
              <p className="text-sm truncate min-w-0">{song.title}</p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onRequestEdit(song)}
                  aria-label="編集"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(song)}
                  aria-label="削除"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 削除確認ダイアログ内で、対象の曲名・アーティストを並べて表示するカード。
 */
function SongSummaryCard({ song }: { song: { title: string; artist: string } }) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-sm">
        <span className="text-muted-foreground">曲名 </span>
        {song.title}
      </p>
      <p className="text-sm">
        <span className="text-muted-foreground">アーティスト </span>
        {song.artist}
      </p>
    </div>
  );
}
