"use client";

import { useState, useEffect, useRef } from "react";
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
  isTakeover?: boolean;
};

/**
 * エントリー最終確認ダイアログ。
 * 選択した曲・パートを曲ごとにまとめて表示し、パートごとの譲渡可否・SNS同意・参加ポリシー同意・コメント入力を行って送信を確定する。
 */
export function EntryConfirmDialog({
  open,
  entries,
  participationFee,
  onClose,
  onSubmit,
}: {
  open: boolean;
  entries: EntryItem[];
  participationFee: number;
  onClose: () => void;
  onSubmit: (params: { snsConsent: boolean; policyConsent: boolean; comment: string; transferableKeys: Set<string> }) => Promise<void>;
}) {
  const [snsConsent, setSnsConsent] = useState(true);
  const [policyConsent, setPolicyConsent] = useState(false);
  const [comment, setComment] = useState("");
  const [transferable, setTransferable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  // 曲ごとにパートをまとめる
  const groupedBySong = entries.reduce<
    Map<string, { songTitle: string; songArtist: string; parts: Array<{ part: Part; isTakeover: boolean }> }>
  >((map, entry) => {
    const existing = map.get(entry.eventSongId);
    const item = { part: entry.part, isTakeover: entry.isTakeover ?? false };
    if (existing) {
      existing.parts.push(item);
    } else {
      map.set(entry.eventSongId, {
        songTitle: entry.songTitle,
        songArtist: entry.songArtist,
        parts: [item],
      });
    }
    return map;
  }, new Map());

  function toggleTransferable(key: string) {
    setTransferable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ snsConsent, policyConsent, comment: comment.trim(), transferableKeys: transferable });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エントリーに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setSnsConsent(true);
    setPolicyConsent(false);
    setComment("");
    setTransferable(new Set());
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
                  <div className="mt-2 space-y-1.5">
                    {parts.map(({ part, isTakeover }) => {
                      const key = `${eventSongId}:${part}`;
                      const isTransferable = transferable.has(key);
                      return (
                        <div key={part} className="flex items-center justify-between gap-2">
                          <span className="inline-block rounded bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                            {PART_LABELS[part]}
                          </span>
                          {isTakeover ? (
                            <span className="text-xs text-muted-foreground">
                              譲渡引受のため譲渡不可
                            </span>
                          ) : (
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isTransferable}
                                onChange={() => toggleTransferable(key)}
                                className="h-3.5 w-3.5 cursor-pointer"
                              />
                              譲渡可能
                            </label>
                          )}
                        </div>
                      );
                    })}
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

          {/* 参加ポリシー同意 */}
          <div className="flex items-start gap-3">
            <input
              id="confirm-policyConsent"
              type="checkbox"
              checked={policyConsent}
              onChange={(e) => setPolicyConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <Label htmlFor="confirm-policyConsent" className="text-sm leading-snug cursor-pointer">
              <span>
                参加費は{participationFee.toLocaleString()}円です。
                <a
                  href="/participation-policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  参加ポリシー
                </a>
                に同意します
              </span>
            </Label>
          </div>

          {/* SNS同意 */}
          <div className="flex items-start gap-3">
            <input
              id="confirm-snsConsent"
              type="checkbox"
              onChange={(e) => setSnsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <Label htmlFor="confirm-snsConsent" className="text-sm leading-snug cursor-pointer">
              セッションの様子(写真・動画等)をSNS等に掲載する場合があることに同意します(任意)
            </Label>
          </div>

          {error && <p ref={errorRef} className="text-sm text-destructive">{error}</p>}
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" disabled={loading || !policyConsent} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "送信中..." : "エントリーを確定する"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
