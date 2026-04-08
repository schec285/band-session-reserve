"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import type { SongWithReservations } from "@/lib/types/api/events";
import type { Part } from "@drizzle/schema";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * 全パートの表示順と日本語ラベルの定義。
 */
const ALL_PARTS: { value: Part; label: string }[] = [
  { value: "vocal", label: "ボーカル" },
  { value: "readGuitar", label: "リードギター" },
  { value: "backingGuitar", label: "バッキングギター" },
  { value: "bass", label: "ベース" },
  { value: "drums", label: "ドラム" },
  { value: "keyboard", label: "キーボード" },
  { value: "other", label: "その他" },
];

/**
 * 曲一覧とパート別予約状況を横並びテーブルで表示するコンポーネント。
 * ログイン済みの場合は空きパートにチェックボックスを表示し、一括エントリーができる。
 * 未ログインの場合は空きパートを「空き」表示のみとし、エントリー送信時にサインインへ誘導する。
 */
export function SongList({
  songs,
  eventId,
}: {
  songs: SongWithReservations[];
  eventId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [snsConsent, setSnsConsent] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLoggedIn = !!session;
  const hasSelection = selected.size > 0;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isLoggedIn) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (selected.size === 0) {
      setError("エントリーするパートを1つ以上選択してください");
      return;
    }
    if (!snsConsent) {
      setError("SNS掲載への同意が必要です");
      return;
    }

    setLoading(true);
    setError(null);

    const entries = Array.from(selected).map((key) => {
      const colonIndex = key.indexOf(":");
      return {
        eventSongId: key.slice(0, colonIndex),
        part: key.slice(colonIndex + 1),
      };
    });

    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries,
        snsConsent,
        comment: comment.trim() || undefined,
      }),
    });

    setLoading(false);

    if (res.status === 401) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!res.ok) {
      const json = await res.json();
      setError(json.message ?? "エントリーに失敗しました");
      return;
    }

    setSelected(new Set());
    setSnsConsent(false);
    setComment("");
    setSuccessMessage("エントリーを受け付けました！セッションでお待ちしています");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 曲一覧テーブル */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {/* ヘッダー行 */}
          <thead>
            <tr className="bg-muted border-b">
              <th className="text-left px-4 py-3 font-medium w-40 sticky left-0 bg-muted z-10">
                曲
              </th>
              {ALL_PARTS.map(({ value, label }) => (
                <th key={value} className="text-center px-3 py-3 font-medium whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          {/* 曲ごとの行 */}
          <tbody>
            {songs.map((song, i) => {
              const reservationMap = new Map(
                song.reservations.map((r) => [r.part, r.username])
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
                  {ALL_PARTS.map(({ value }) => {
                    const isRecruiting = reservationMap.has(value);
                    const username = reservationMap.get(value);
                    const isFilled = username != null;

                    if (!isRecruiting) {
                      return (
                        <td key={value} className="bg-muted/80 px-3 py-3 text-center">
                          <span className="text-muted-foreground/40 text-xs">─</span>
                        </td>
                      );
                    }

                    if (isFilled) {
                      return (
                        <td key={value} className="px-3 py-3 text-center">
                          <span className="text-sm font-medium">{username}</span>
                        </td>
                      );
                    }

                    const key = `${song.eventSongId}:${value}`;
                    const isChecked = selected.has(key);

                    return (
                      <td key={value} className="px-3 py-3 text-center">
                        {isLoggedIn ? (
                          <input
                            type="checkbox"
                            aria-label={`${song.title} ${ALL_PARTS.find((p) => p.value === value)?.label}`}
                            checked={isChecked}
                            onChange={() => toggleEntry(song.eventSongId, value)}
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

      {/* エントリーフォーム（ログイン済みかつ1つ以上選択時に展開） */}
      {isLoggedIn && hasSelection && (
        <div className="rounded-lg border p-4 space-y-4">
          {/* コメント */}
          <div className="space-y-1.5">
            <Label htmlFor="comment">コメント（任意）</Label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="一言メッセージなど"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* SNS同意 */}
          <div className="flex items-start gap-3">
            <input
              id="snsConsent"
              type="checkbox"
              checked={snsConsent}
              onChange={(e) => setSnsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <Label htmlFor="snsConsent" className="text-sm leading-snug cursor-pointer">
              セッションの様子がSNSに掲載される場合があることに同意します
            </Label>
          </div>
        </div>
      )}

      {/* 未ログイン時のエントリー誘導 */}
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      {isLoggedIn && (
        <Button type="submit" disabled={loading || isPending}>
          {loading || isPending ? "送信中..." : "エントリーする"}
        </Button>
      )}
    </form>
  );
}
