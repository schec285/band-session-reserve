"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartBadgeList } from "@/components/PartBadgeList";
import type { AdminEventSongInfo } from "@/server/services/admin/events";
import { AdminEventSongManager } from "./AdminEventSongManager";

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Props {
  eventId: string;
  eventSongs: AdminEventSongInfo[];
  allSongs: Song[];
}

/**
 * イベント詳細画面の「登録曲」セクション。
 * 通常時は登録済み曲を一覧表示し、右上の編集アイコンでその場を AdminEventSongManager による
 * インライン編集表示に切り替える。閉じる操作（未保存の変更がある場合の確認含む）は
 * AdminEventSongManager 側の「閉じる」ボタンに委ねる。
 */
export function AdminEventSongsSection({ eventId, eventSongs, allSongs }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="border rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">登録曲</h2>
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="登録曲を編集"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <AdminEventSongManager
          eventId={eventId}
          eventSongs={eventSongs}
          allSongs={allSongs}
          onClose={() => setIsEditing(false)}
        />
      ) : eventSongs.length === 0 ? (
        <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
      ) : (
        <div className="space-y-2">
          {eventSongs.map((song) => (
            <div key={song.eventSongId} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{song.title}</p>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
                <div className="mt-1">
                  <PartBadgeList parts={song.parts} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
