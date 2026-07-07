"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Toast, type ToastVariant } from "@/components/ui/Toast";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface PendingSong {
  id: string;
  title: string;
  artist: string;
}

interface Props {
  /** アーティスト候補リストの元になる既存曲一覧 */
  songs: Song[];
  /** 登録成功時・キャンセル時の遷移先。省略時は /admin/songs */
  cancelPath?: string;
}

/**
 * 曲名・アーティストの組み合わせから重複判定用のキーを作る。
 */
function songKey(title: string, artist: string): string {
  return `${title} ${artist}`;
}

/**
 * 曲マスタの新規作成フォーム。
 * 「追加する」で入力内容を登録予定の一覧に積み上げ、「登録する」でまとめて送信する。
 * アーティスト入力欄には、既存曲のアーティスト名から部分一致で候補を表示する。
 */
export function SongForm({ songs, cancelPath = "/admin/songs" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  // アーティスト入力の候補ドロップダウンを表示するかどうか。入力欄からフォーカスが外れたら閉じる。
  const [artistSearchOpen, setArtistSearchOpen] = useState(false);

  // 「追加する」で積み上げた、登録予定の曲一覧。
  const [pendingSongs, setPendingSongs] = useState<PendingSong[]>([]);
  // 重複と判定された曲名・アーティストのキー。該当行を赤背景で表示する。
  const [duplicateKeys, setDuplicateKeys] = useState<Set<string>>(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  // 曲マスタ上のアーティスト名を重複排除した候補一覧。songs はアーティスト昇順のため追加ソート不要。
  const artistCandidates = useMemo(() => Array.from(new Set(songs.map((s) => s.artist))), [songs]);

  // 入力中のアーティスト名で部分一致（大文字小文字を区別しない）する候補を最大10件返す。
  const artistSearchResults = useMemo(() => {
    const query = artist.trim().toLowerCase();
    const matched =
      query === "" ? artistCandidates : artistCandidates.filter((a) => a.toLowerCase().includes(query));
    return matched.slice(0, 10);
  }, [artistCandidates, artist]);

  /**
   * 曲名・アーティストの入力内容を登録予定の一覧に追加し、入力欄をクリアする。
   * どちらかが未入力の場合はエラーを表示し追加しない。
   * 登録予定の一覧に同じ組み合わせが既にある場合はトースト通知のみ出し、該当行を赤背景で示す。
   */
  function handleStage() {
    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();

    if (!trimmedTitle || !trimmedArtist) {
      setStageError("曲名とアーティストの両方を入力してください");
      return;
    }
    setStageError(null);

    const key = songKey(trimmedTitle, trimmedArtist);
    const isDuplicateInPending = pendingSongs.some((s) => songKey(s.title, s.artist) === key);

    if (isDuplicateInPending) {
      setDuplicateKeys((prev) => new Set(prev).add(key));
      setToast({ message: "重複した曲があります", variant: "error" });
      return;
    }

    setPendingSongs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: trimmedTitle, artist: trimmedArtist },
    ]);
    setTitle("");
    setArtist("");
    setArtistSearchOpen(false);
  }

  function handleRemovePending(id: string) {
    setPendingSongs((prev) => {
      const removed = prev.find((s) => s.id === id);
      if (removed) {
        const key = songKey(removed.title, removed.artist);
        setDuplicateKeys((keys) => {
          const next = new Set(keys);
          next.delete(key);
          return next;
        });
      }
      return prev.filter((s) => s.id !== id);
    });
  }

  /**
   * キャンセルボタン押下時の処理。登録予定の曲が残っている場合は破棄確認ダイアログを挟み、
   * なければ即座に一覧画面へ遷移する。
   */
  function handleCancelClick() {
    if (pendingSongs.length > 0) {
      setConfirmDiscardOpen(true);
    } else {
      startTransition(() => router.push(cancelPath));
    }
  }

  /**
   * 確認ダイアログでの確定操作。登録予定の一覧をまとめてAPIに送信する。
   * 成功時は曲一覧画面に遷移してトースト通知を出し、失敗時は遷移せずこの画面でトースト通知を出す。
   */
  async function handleConfirmRegister() {
    setConfirmOpen(false);
    setSubmitting(true);

    const res = await fetchWithCsrf("/api/admin/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songs: pendingSongs.map(({ title, artist }) => ({ title, artist })),
      }),
    });

    if (res.ok) {
      const count = pendingSongs.length;
      startTransition(() => {
        router.push(`${cancelPath}?created=${count}`);
      });
    } else {
      setSubmitting(false);
      const json = await res.json();
      if (Array.isArray(json.duplicates)) {
        setDuplicateKeys((prev) => {
          const next = new Set(prev);
          for (const d of json.duplicates as { title: string; artist: string }[]) {
            next.add(songKey(d.title, d.artist));
          }
          return next;
        });
      }
      setToast({ message: json.message ?? "登録に失敗しました", variant: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">曲登録</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancelClick}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={pendingSongs.length === 0 || submitting || isPending}
          >
            {submitting || isPending ? "登録中..." : "登録する"}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="title">曲名</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleStage();
                }
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="artist">アーティスト</Label>
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setArtistSearchOpen(false);
                }
              }}
            >
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                onFocus={() => setArtistSearchOpen(true)}
                onClick={() => setArtistSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setArtistSearchOpen(false);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setArtistSearchOpen(false);
                    handleStage();
                  }
                }}
              />
              {artistSearchOpen && artistSearchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-background shadow-lg divide-y">
                  {artistSearchResults.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => {
                        setArtist(candidate);
                        setArtistSearchOpen(false);
                      }}
                      className="w-full text-left p-2 text-sm hover:bg-muted"
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {stageError && <p className="text-destructive text-sm">{stageError}</p>}

        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" size="sm" onClick={handleStage}>
            追加する
          </Button>
        </div>

        {pendingSongs.length > 0 && (
          <div className="space-y-2 pt-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              追加する曲一覧（{pendingSongs.length}件）
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>曲名</span>
                <span>アーティスト</span>
                <span aria-hidden="true" />
              </div>
              <div className="divide-y">
                {pendingSongs.map((song) => {
                  const isDuplicate = duplicateKeys.has(songKey(song.title, song.artist));
                  return (
                    <div
                      key={song.id}
                      className={`grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-3 py-2 ${
                        isDuplicate ? "bg-destructive/10" : ""
                      }`}
                    >
                      <p className="text-sm">{song.title}</p>
                      <p className="text-sm">{song.artist}</p>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(song.id)}
                        aria-label="削除"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogHeader title="登録確認" onClose={() => setConfirmOpen(false)} />
        <DialogContent>
          <p className="text-sm">{pendingSongs.length}件の曲を登録します。よろしいですか？</p>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            キャンセル
          </Button>
          <Button type="button" size="sm" onClick={handleConfirmRegister}>
            登録する
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={confirmDiscardOpen} onClose={() => setConfirmDiscardOpen(false)}>
        <DialogHeader title="変更の破棄確認" onClose={() => setConfirmDiscardOpen(false)} />
        <DialogContent>
          <p className="text-sm">
            追加予定の曲（{pendingSongs.length}件）を破棄して曲管理一覧に戻ります。よろしいですか？
          </p>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDiscardOpen(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmDiscardOpen(false);
              startTransition(() => router.push(cancelPath));
            }}
          >
            破棄する
          </Button>
        </DialogFooter>
      </Dialog>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
