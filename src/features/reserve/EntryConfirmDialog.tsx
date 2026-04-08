"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PART_LABELS } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

export type EntryItem = {
  songTitle: string;
  songArtist: string;
  eventSongId: string;
  part: Part;
};

/**
 * エントリー最終確認ダイアログ。
 * 選択した曲・パートを曲ごとにまとめて表示し、SNS同意・コメント入力を行って送信を確定する。
 */
export function EntryConfirmDialog({
  open,
  entries,
  onClose,
  onSubmit,
}: {
  open: boolean;
  entries: EntryItem[];
  onClose: () => void;
  onSubmit: (params: { snsConsent: boolean; comment: string }) => Promise<void>;
}) {
  const [snsConsent, setSnsConsent] = useState(true);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 曲ごとにパートをまとめる
  const groupedBySong = entries.reduce<
    Map<string, { songTitle: string; songArtist: string; parts: Part[] }>
  >((map, entry) => {
    const existing = map.get(entry.eventSongId);
    if (existing) {
      existing.parts.push(entry.part);
    } else {
      map.set(entry.eventSongId, {
        songTitle: entry.songTitle,
        songArtist: entry.songArtist,
        parts: [entry.part],
      });
    }
    return map;
  }, new Map());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!snsConsent) {
      setError("SNS掲載への同意が必要です");
      return;
    }
    setLoading(true);
    setError(null);
    await onSubmit({ snsConsent, comment: comment.trim() });
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    setSnsConsent(true);
    setComment("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader title="エントリー確認" onClose={handleClose} />

        <DialogContent>
          {/* 選択した曲・パート一覧（曲ごとにまとめ） */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">エントリー内容</p>
            <ul className="space-y-2">
              {Array.from(groupedBySong.entries()).map(([eventSongId, { songTitle, songArtist, parts }]) => (
                <li key={eventSongId} className="rounded-md bg-muted/50 px-3 py-2.5 text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground shrink-0">曲名</span>
                      <span className="font-medium">{songTitle}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground shrink-0">アーティスト</span>
                      <span className="text-sm">{songArtist}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {parts.map((part) => (
                      <span
                        key={part}
                        className="inline-block rounded bg-blue-100 text-blue-700 text-xs px-2 py-0.5"
                      >
                        {PART_LABELS[part]}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* コメント */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-comment">コメント（任意）</Label>
            <textarea
              id="confirm-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="一言メッセージなど"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* SNS同意 */}
          <div className="flex items-start gap-3">
            <input
              id="confirm-snsConsent"
              type="checkbox"
              checked={snsConsent}
              onChange={(e) => setSnsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <Label htmlFor="confirm-snsConsent" className="text-sm leading-snug cursor-pointer">
              セッションの様子がSNSに掲載される場合があることに同意します
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "送信中..." : "エントリーを確定する"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
