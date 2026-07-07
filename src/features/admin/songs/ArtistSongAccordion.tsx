"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Props {
  songs: Song[];
}

/**
 * アーティスト名でグルーピングした曲一覧を、アーティストごとのアコーディオンで表示するコンポーネント。
 * songs はアーティスト名昇順・曲名昇順でソート済みであることを前提とする。
 */
export function ArtistSongAccordion({ songs }: Props) {
  const groups = new Map<string, Song[]>();
  for (const song of songs) {
    const group = groups.get(song.artist);
    if (group) {
      group.push(song);
    } else {
      groups.set(song.artist, [song]);
    }
  }

  return (
    <div className="space-y-2">
      {Array.from(groups.entries()).map(([artist, artistSongs]) => (
        <ArtistGroup key={artist} artist={artist} songs={artistSongs} />
      ))}
    </div>
  );
}

/**
 * 単一アーティストの曲一覧をアコーディオン表示するコンポーネント。デフォルトは閉じた状態。
 */
function ArtistGroup({ artist, songs }: { artist: string; songs: Song[] }) {
  const [open, setOpen] = useState(false);

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
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="divide-y border-t">
          {songs.map((song) => (
            <div key={song.id} className="p-3 pl-6">
              <p className="text-sm">{song.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
