"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MyReservationItem } from "@/lib/types/domain/user";
import { PART_LABELS } from "@/lib/utils/parts";
import type { Part } from "@drizzle/schema";

type Props = {
  reservations: MyReservationItem[];
};

type SongGroup = {
  songKey: string;
  title: string;
  artist: string;
  items: MyReservationItem[];
};

type EventGroup = {
  eventId: string;
  title: string;
  startAt: string;
  venue: string;
  songs: SongGroup[];
};

/**
 * 予約一覧をイベント → 曲の順にグループ化して返す。
 * 元の並び順（日時昇順）を保持する。
 */
function groupByEventAndSong(reservations: MyReservationItem[]): EventGroup[] {
  const eventMap = new Map<string, EventGroup>();
  for (const item of reservations) {
    const { id, title, startAt, venue } = item.event;
    if (!eventMap.has(id)) {
      eventMap.set(id, { eventId: id, title, startAt, venue, songs: [] });
    }
    const eventGroup = eventMap.get(id)!;
    const songKey = `${item.song.title}__${item.song.artist}`;
    const songGroup = eventGroup.songs.find((s) => s.songKey === songKey);
    if (songGroup) {
      songGroup.items.push(item);
    } else {
      eventGroup.songs.push({ songKey, title: item.song.title, artist: item.song.artist, items: [item] });
    }
  }
  return Array.from(eventMap.values());
}

/**
 * マイ予約一覧をイベント・曲ごとにグループ化し、アコーディオンで表示するコンポーネント。
 * 予約が0件のときは「予約はありません」を表示する。
 */
export function MyReservationList({ reservations }: Props) {
  const groups = groupByEventAndSong(reservations);
  const now = Date.now();
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(groups.filter((g) => new Date(g.startAt).getTime() > now).map((g) => g.eventId))
  );

  if (reservations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">予約はありません</p>
    );
  }

  function toggle(eventId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openIds.has(group.eventId);
        const date = new Date(group.startAt);
        const dateLabel = date.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
        });
        const timeLabel = date.toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={group.eventId} className="rounded-lg border border-border overflow-hidden">
            {/* イベントヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="font-semibold text-base">{group.title}</p>
                  <Link
                    href={`/events/${group.eventId}`}
                    className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity shrink-0"
                  >
                    イベントを見る
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {dateLabel}　{timeLabel}　{group.venue}
                </p>
              </div>
              <button
                onClick={() => toggle(group.eventId)}
                aria-label={isOpen ? "閉じる" : "開く"}
                className="ml-3 p-1 rounded hover:bg-muted transition-colors shrink-0"
              >
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* 曲別グループ */}
            {isOpen && (
              <ul className="divide-y divide-border">
                {group.songs.map((song) => (
                  <li key={song.songKey} className="px-4 py-3">
                    <p className="text-sm font-medium">
                      {song.title}
                      <span className="text-muted-foreground font-normal ml-2">{song.artist}</span>
                    </p>
                    <ul className="mt-1.5 space-y-0.5 pl-3 border-l border-border">
                      {song.items.map((item) => (
                        <li key={item.reservationId} className="text-sm text-muted-foreground">
                          パート：{PART_LABELS[item.part as Part]}
                          {item.isTransferable && (
                            <span className="text-green-600 ml-1">（譲渡可）</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
