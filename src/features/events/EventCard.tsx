import Link from "next/link";
import { AlarmClock, Calendar, MapPin, Ticket } from "lucide-react";
import type { Event } from "@/lib/types/domain/events";
import { EventStatusBadge, getEventStatus } from "@/components/EventStatusBadge";
import { calcRemainingDays, formatDateRange, formatDatetime } from "@/lib/utils/date";

/**
 * イベント 1 件のカード表示。
 * 日付・時刻・会場をアイコン付きで表示し、ステータスバッジを右上に配置する。
 * 受付締切日時が設定されている場合のみ締切行を表示し、末尾に残り日数を添える。
 */
export function EventCard({ event }: { event: Event }) {
  const status = getEventStatus(event);
  const isUpcoming = status === "upcoming" || status === "ongoing";
  const remainingDays = event.closedAt ? calcRemainingDays(event.closedAt) : null;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={`relative rounded-xl border bg-card transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 overflow-hidden ${status === "ongoing" ? "border-green-200" : status === "upcoming" ? "border-blue-200" : "border-border"}`}>
        {/* 左アクセントライン */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${status === "ongoing" ? "bg-green-500" : status === "upcoming" ? "bg-blue-500" : "bg-muted-foreground/30"}`} />

        <div className="pl-5 pr-4 py-4">
          {/* タイトル行 + バッジ */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-xl leading-snug group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <EventStatusBadge status={status} className="text-sm px-3 py-1" />
          </div>

          {/* メタ情報 */}
          <div className="space-y-2 text-base text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{formatDateRange(event.startAt, event.endAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{event.venue}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 shrink-0" />
              <span>参加費 {event.participationFee.toLocaleString()}円</span>
            </div>
            {event.closedAt && (
              <div className="flex items-center gap-2">
                <AlarmClock className="w-4 h-4 shrink-0" />
                <span>
                  受付締切 {formatDatetime(event.closedAt)}
                  {remainingDays !== null && `（残り${remainingDays}日）`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
