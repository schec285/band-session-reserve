import { ReserveButton } from "@/features/reserve/ReserveButton";
import type { SongWithReservations } from "@/lib/types/api/events";
import type { Part } from "@drizzle/schema";

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
 * 募集していないパートはグレー、空きは予約ボタン、埋まりは予約者名を表示する。
 */
export function SongList({ songs }: { songs: SongWithReservations[] }) {
  if (songs.length === 0) {
    return <p className="text-sm text-muted-foreground">曲が登録されていません</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {/* ヘッダー行 */}
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-4 py-3 font-medium w-40 sticky left-0 bg-muted/50 z-10">
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
                    i % 2 === 1 ? "bg-muted/20" : "bg-background"
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
                      <td key={value} className="bg-muted/40 px-3 py-3 text-center">
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

                  return (
                    <td key={value} className="px-3 py-3 text-center">
                      <ReserveButton eventSongId={song.eventSongId} part={value} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
