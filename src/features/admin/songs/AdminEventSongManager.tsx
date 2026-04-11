"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PART_LABELS } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

const ALL_PARTS = Object.keys(PART_LABELS) as Part[];

interface EventSong {
  eventSongId: string;
  songId: string;
  title: string;
  artist: string;
  parts: Part[];
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
 * イベントの曲一覧表示・追加・削除を管理するコンポーネント。
 */
export function AdminEventSongManager({ eventId, eventSongs, allSongs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

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
      setSelectedSongId("");
      setSelectedParts([]);
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setError(json.message ?? "追加に失敗しました");
    }
  }

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

  return (
    <div className="space-y-6">
      {/* 登録済み曲一覧 */}
      {eventSongs.length === 0 ? (
        <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
      ) : (
        <div className="space-y-2">
          {eventSongs.map((song) => (
            <div
              key={song.eventSongId}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium text-sm">{song.title}</p>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {song.parts.map((p) => PART_LABELS[p] ?? p).join("・")}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(song.eventSongId)}
              >
                削除
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 曲追加フォーム */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-sm">曲を追加する</h3>

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

        <Button size="sm" onClick={handleAdd} disabled={adding || isPending}>
          {adding || isPending ? "追加中..." : "追加する"}
        </Button>
      </div>
    </div>
  );
}
