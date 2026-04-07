import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SongWithReservations } from "@/lib/types/api/events";

/**
 * 曲一覧とパート別予約状況を表示するコンポーネント。
 */
export function SongList({ songs }: { songs: SongWithReservations[] }) {
  if (songs.length === 0) {
    return <p className="text-sm text-muted-foreground">曲が登録されていません</p>;
  }

  return (
    <div className="space-y-3">
      {songs.map((song) => (
        <Card key={song.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{song.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{song.artist}</p>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {song.reservations.map((r) => (
                <div key={r.part} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{r.part}</span>
                  {r.username ? (
                    <span>{r.username}</span>
                  ) : (
                    <span className="text-muted-foreground">空き</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
