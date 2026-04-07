import { Calendar, Clock, MapPin } from "lucide-react";
import type { Event } from "@/lib/types/api/events";

/**
 * 日付を「YYYY年M月D日」形式にフォーマットする。
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 時刻を「HH:MM」形式にフォーマットする。
 */
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * イベントの開催ステータスを判定する。
 */
function getStatus(event: Event): "upcoming" | "ended" {
  return new Date() <= new Date(event.endAt) ? "upcoming" : "ended";
}

/**
 * イベント 1 件のカード表示。
 * 日付・時刻・会場をアイコン付きで表示し、ステータスバッジを右上に配置する。
 */
export function EventCard({ event }: { event: Event }) {
  const status = getStatus(event);
  const isUpcoming = status === "upcoming";

  return (
    <a href={`/events/${event.id}`} className="block group">
      <div className={`relative rounded-xl border bg-card transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 overflow-hidden ${isUpcoming ? "border-blue-200" : "border-border"}`}>
        {/* 左アクセントライン */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUpcoming ? "bg-blue-500" : "bg-muted-foreground/30"}`} />

        <div className="pl-5 pr-4 py-4">
          {/* タイトル行 + バッジ */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${isUpcoming ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
              {isUpcoming ? "募集中" : "終了"}
            </span>
          </div>

          {/* メタ情報 */}
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDate(event.startAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTime(event.startAt)}〜{formatTime(event.endAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
